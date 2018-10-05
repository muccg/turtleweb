import logging
import os
import subprocess
import tempfile
import re
from os.path import dirname, join, isfile
from operator import attrgetter

from django.conf import settings
from django.core.urlresolvers import reverse
from ..people.models import NoChildren

logger = logging.getLogger(__name__)


class Madeline(object):
    svg_extension = '.svg'
    # matches terminal control codes
    control_re = re.compile(r'\x1b\[[^m]+m')

    @classmethod
    def get_madeline2_prog(cls):
        return getattr(settings, "MADELINE2_PROG", "madeline2")

    @classmethod
    def get_xslt_filename(cls):
        return join(dirname(__file__), "scripts", "fix_madeline.xsl")

    @classmethod
    def stripped_lines(cls, s):
        return [_f for _f in [cls.control_re.sub('', t).strip() for t in s.splitlines()] if _f]

    @classmethod
    def safe_unlink(cls, path):
        try:
            os.unlink(path)
        except OSError as e:
            logger.warning("Couldn't remove file %s: %s" % (path, e))

    @classmethod
    def run_and_log_failure(cls, executable, args):
        with open(os.devnull) as null:
            p = subprocess.Popen(
                args, executable=executable,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=null,
                close_fds=True)
            stdout, stderr = p.communicate()
        success = p.returncode == 0
        if not success:
            logger.warning("%s exited with status %d" % (executable, p.returncode))
            logger.warning("args: %s" % " ".join(args))
            logger.warning("stdout:\n%s\n" % stdout)
            logger.warning("stderr:\n%s\n" % stdout)
        return success, stdout, stderr

    @classmethod
    def build_madeline_args(cls, form, prefix, tsv_path):
        opts = ["--outputprefix", prefix, "--outputext", cls.svg_extension]

        if form.cleaned_data["nolabeltruncation"]:
            opts.append("--nolabeltruncation")
        if form.cleaned_data["color"]:
            opts.append("--color")

        labels = form.get_label_names()
        if labels:
            opts.extend(["-L", " ".join(labels)])
        sibling_sort = form.get_sibling_sort()
        if sibling_sort:
            opts.extend(["--sort", sibling_sort])

        return ["madeline2", "--embedded"] + list(map(str, opts)) + [tsv_path]

    @classmethod
    def get_madeline_svg(cls, family, form):
        tsv = tempfile.NamedTemporaryFile(prefix="kindred-", suffix=".tsv", delete=False)
        family_group_tsv(tsv, family, form.cleaned_data["affected"])
        tsv.close()

        prefix = os.path.splitext(tsv.name)[0]
        path = prefix + cls.svg_extension
        args = cls.build_madeline_args(form, prefix, tsv.name)

        madeline2 = cls.get_madeline2_prog()
        if not isfile(madeline2):
            return None, None, ["madeline2 executable not found"]

        success, stdout, stderr = cls.run_and_log_failure(madeline2, args)
        # sometimes madeline will quit with 0, but not render anything
        if not isfile(path):
            success = False
        messages, errors = (cls.stripped_lines(t) for t in (stdout, stderr))
        cls.safe_unlink(tsv.name)
        if success:
            return path, messages, errors
        return None, messages, errors

    @classmethod
    def postprocess_svg(cls, svg_path):
        args = [
            "xsltproc", "--nonet",
            "-o", "-",
            cls.get_xslt_filename(),
            svg_path]
        success, stdout, stderr = cls.run_and_log_failure('xsltproc', args)
        errors = cls.stripped_lines(stderr)
        if success:
            return stdout, errors
        return None, errors


def family_group_tsv(outfile, family_group, diagnosis_index):
    def v1_api_url(resource_name, pk):
        return "%s/%s/%s" % (reverse("api_v1_top_level", kwargs={"api_name": "v1"}),
                             resource_name, pk)
        return reverse("api_dispatch_detail", kwargs={
            "api_name": "v1",
            "resouce_name": resource_name,
            "pk": str(pk)})

    def v1_api_url2(item):
        return v1_api_url(type(item).__name__.lower(), item.id)

    # headers with type qualifiers for any custom fields where required
    headers = [
        "FamilyId",
        "IndividualId",
        "Gender",
        "Father",
        "Mother",
        "DOB",
        "Deceased",
        "Proband",
        "Id N",
        "Name S",
    ]

    diagnosis_index_ids = list(map(attrgetter("id"), diagnosis_index))
    affected_headers = ["Affected_%s" % id for id in diagnosis_index_ids]

    def escape(text):
        return text.replace("\t", " ")

    def cellify(value):
        text = str(value) if value is not None else ""
        return text or "."

    def write_row(row):
        outfile.write(("\t".join(map(escape, map(cellify, row))) + "\n").encode("utf-8"))

    write_row(headers + affected_headers)

    def person_uri(id):
        # return ("P%d" % id) if id is not None else ""
        return v1_api_url("person", id) if id is not None else ""

    def family_group_uri(id):
        # return "F%d" % id
        return v1_api_url("family", id) if id is not None else ""

    def date_fmt(dt):
        return str(dt) if dt is not None else ""

    def yesno(val):
        return ("Y" if val else "N") if val is not None else ""

    def affected_status(status_name):
        st = status_name.upper()[:1]
        # return ("Y" if st == "A" else "N") if st else ""
        return st

    def nochildren_symbol(entry):
        prefix = "&" if entry.reason == "I" else "^"
        return prefix + v1_api_url("nochildren", entry.id)

    for member in family_group.members.all():
        # fixme: these lookups will be slow, need to optimize
        membership = member.family_membership.filter(family_group=family_group)[0]

        diagnoses = member.diagnosis_set.filter(index__in=diagnosis_index_ids)
        diagnoses = diagnoses.exclude(status__isnull=True).order_by("id")
        diagnoses = diagnoses.values_list("index__id", "status__name")

        affected_dict = dict((id, affected_status(st)) for (id, st) in diagnoses)
        affected = [affected_dict.get(id, "") for id in diagnosis_index_ids]

        write_row([
            family_group_uri(family_group.id),
            person_uri(member.id),
            member.sex,
            person_uri(member.father_id),
            person_uri(member.mother_id),
            date_fmt(member.dob),
            yesno(member.deceased),
            yesno(membership.proband),
            str(member.id),
            member.get_full_name(),
        ] + affected)

    males = family_group.members.filter(sex="M")
    females = family_group.members.filter(sex="F")
    no_children = NoChildren.objects.filter(male__in=males, female__in=females)

    for entry in no_children:
        write_row([
            family_group_uri(family_group.id),
            nochildren_symbol(entry),
            "",
            person_uri(entry.male_id),
            person_uri(entry.female_id),
            "",
            "",
            "",
            str(entry.id),
            "",
        ] + [""] * len(diagnosis_index_ids))
