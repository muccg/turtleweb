from django.db import models
from reversion import revisions

from ..app.models import AbstractNameList, AbstractNameDescList


class DiagnosisIndex(AbstractNameDescList):
    """
    DiagnosisIndex
    kintrak table: lt_f695
    FamilyDiagnosisIndex
    kintrak table: lt_f942
    """
    code = models.CharField(max_length=254, blank=True)  # f546
    group = models.CharField(max_length=254, blank=True)  # f547 -- free-form text

    class Meta(AbstractNameList.Meta):
        verbose_name_plural = "diagnosis indices"


class BloodGroup(AbstractNameList):
    """
    BloodGroup
    """
    pass


class PathLab(AbstractNameList):
    """
    Pathology lab location.
    """


@revisions.register
class BodyPart(AbstractNameList):
    """
    BodyPart
    """
    pass


class TumourSite(AbstractNameList):
    """
    TumourSite
    kintrak table: lt_f688
    """
    code = models.CharField(max_length=256, blank=True)  # f619
    group = models.CharField(max_length=256, blank=True)  # f620


class TumourStage(AbstractNameList):
    """
    TumourStage
    kintrak table: lt_f689
    """
    desc = models.CharField(max_length=1000, blank=True)  # f623


class GradeStage(AbstractNameDescList):
    pass


class MetStage(AbstractNameDescList):
    pass


class Morphology(AbstractNameList):
    code = models.CharField(max_length=256, blank=True)
    group = models.CharField(max_length=256, blank=True)


class ICD10(AbstractNameDescList):
    """
    ICD-10 as imported from Turtle filemaker.
    This model should be updated to correspond to the official codes.txt.
    """
    desc2 = models.TextField(blank=True, verbose_name="long description")
