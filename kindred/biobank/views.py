import os.path
import datetime
import subprocess
import tempfile
import logging

from django.http import HttpResponse
from django.views.generic import View
from django.shortcuts import get_object_or_404
from django import forms

import qrcode
import qrcode.image.svg
import xml.etree.ElementTree as ET
from pdfrw import PdfReader, PdfWriter, IndirectPdfDict

from .models import Sample

logger = logging.getLogger(__name__)


def _sample_qr(sample, box_size=1, border=0):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
        image_factory=qrcode.image.svg.SvgPathImage
    )
    qr.add_data(sample.format_id())
    return qr


def _sample_qrcode(sample, outfile, **kwargs):
    qr = _sample_qr(sample, **kwargs)
    qr.make_image(fit=True).save(outfile)
    return outfile


class QRCodeForm(forms.Form):
    box_size = forms.IntegerField(min_value=1, required=False)
    border = forms.IntegerField(min_value=0, required=False)


class SampleQRCode(View):
    def get(self, request, sample_id=None):
        sample = get_object_or_404(Sample, id=sample_id)
        form = QRCodeForm(request.GET)
        if form.is_valid():
            response = HttpResponse(content_type="image/svg+xml")
            return _sample_qrcode(sample, response,
                                  box_size=form.cleaned_data["box_size"] or 10,
                                  border=form.cleaned_data["border"] or 2)
        else:
            return HttpResponse(str(form.errors), content_type="text/html")


class SampleLabel(View):
    def get(self, request, sample_id=None):
        sample = get_object_or_404(Sample, id=sample_id)
        borders = bool(request.GET.get("borders"))
        response = HttpResponse(content_type="image/svg+xml")
        return self.sample_label(response, sample, show_borders=borders)

    @classmethod
    def _get_qr_path(cls, sample):
        qr = _sample_qr(sample)
        return qr.make_image(fit=True).make_path().get("d")

    @classmethod
    def sample_label(cls, response, sample, show_borders=False):
        qrpath = cls._get_qr_path(sample)
        owner = sample.get_owner()
        lines = [
            sample.cls.name,
            owner.get_reverse_name().upper() if owner else "",
        ]
        patient_abbrev = cls.patient_abbrev(owner) or "???"
        patient_id = cls.patient_id(owner) if owner else ""
        return cls._write_svg(qrpath, sample.format_id(), patient_id,
                              patient_abbrev, lines, show_borders,
                              response)

    @staticmethod
    def patient_id(person):
        return person.patient_id or ("P-%06d" % person.id)

    @staticmethod
    def patient_abbrev(person):
        return person.last_name.upper()[:3] if person else ""

    nsmap = {
        'sodipodi': 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
        'cc': 'http://web.resource.org/cc/',
        'svg': 'http://www.w3.org/2000/svg',
        'dc': 'http://purl.org/dc/elements/1.1/',
        'xlink': 'http://www.w3.org/1999/xlink',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'inkscape': 'http://www.inkscape.org/namespaces/inkscape'
    }

    @classmethod
    def _load_sample_svg(cls):
        svgfile = os.path.join(os.path.dirname(__file__), "label.svg")
        for ns, url in cls.nsmap.items():
            ET.register_namespace("" if ns == "svg" else ns, url)
        return ET.parse(svgfile)

    @classmethod
    def _write_svg(cls, qrpath, sample_id, patient_id,
                   patient_abbrev, lines, show_borders, response):
        svg = cls._load_sample_svg()
        root = svg.getroot()

        path = root.find(".//svg:path[@id='qr-path']", namespaces=cls.nsmap)
        if path is not None:
            path.set("d", qrpath)

        sid = root.find(".//svg:text[@id='sample_id']", namespaces=cls.nsmap)
        if sid is not None:
            sid.text = sample_id

        sid = root.find(".//svg:text[@id='patient_id']", namespaces=cls.nsmap)
        if sid is not None:
            sid.text = patient_id

        sid = root.find(".//svg:text[@id='patient_abbrev']", namespaces=cls.nsmap)
        if sid is not None:
            sid.text = patient_abbrev

        for i in range(6):
            st = root.find(".//svg:tspan[@id='sample_type_line%d']" % (i + 1),
                           namespaces=cls.nsmap)
            if st is not None:
                st.text = lines[i] if i < len(lines) else ""

        if not show_borders:
            g = root.find(".//svg:g[@id='stickers']", namespaces=cls.nsmap)
            if g is not None:
                root.remove(g)

        svg.write(response, encoding="utf-8", xml_declaration=True)
        return response


class SampleLabelsPrint(View):
    def get(self, request):
        ids = request.GET.getlist("id")
        samples = Sample.objects.filter(id__in=ids)

        fmt = "labels-%Y%m%d-%H%M%S.pdf"
        filename = datetime.datetime.now().strftime(fmt)

        # Create the HttpResponse object with the appropriate PDF headers.
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="%s"' % filename

        self._pdf_samples(request, response, samples)

        return response

    def _pdf_samples(self, request, response, samples):
        writer = PdfWriter()

        for sample in samples:
            self._pdf_sample(writer, sample)

        writer.trailer.Info = IndirectPdfDict(
            Title="Sample Labels",
            Author=str(request.user),
            Subject="Sample Labels",
            Creator="Turtleweb",
        )

        writer.write(response)

    def _pdf_sample(self, writer, sample):
        with tempfile.NamedTemporaryFile() as svgfile:
            SampleLabel.sample_label(svgfile, sample)
            svgfile.flush()
            with tempfile.NamedTemporaryFile() as pdffile:
                try:
                    subprocess.check_output(["rsvg-convert", "-f", "pdf",
                                             "-o", pdffile.name, svgfile.name],
                                            stderr=subprocess.STDOUT)
                except subprocess.CalledProcessError as e:
                    logger.warning("rsvg label pdf exit code %s: %s" % (e.returncode, e.output))
                except FileNotFoundError:
                    logger.warning("Can't find rsvg-convert in PATH for generating label pdf")
                else:
                    writer.addpages(PdfReader(pdffile.name).pages)
