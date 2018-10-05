from .base import load_users
from .util import load_simple_name_list, load_simple_csv
from ..biobank.models import SampleClass, SampleSubtype
from ..biobank.models import SampleStoredIn, SampleBehaviour, SampleTreatment
from ..people.models import Title
from ..project.models import ConsentStatus
from ..users.models import User

deps = ['base']


def load_data(**kwargs):
    "Requires turtle data already loaded"
    load_demo_users()
    load_titles()
    load_consent_status()
    load_biobank_sampleclass()
    load_sample_subtypes()
    load_sample_stored_in()
    load_sample_behaviour()
    load_sample_treatment()


def load_demo_users():
    load_users([
        ("admin@ccg.murdoch.edu.au", "Admin", "Test", User.LVL_ADMIN),
        ("manager@ccg.murdoch.edu.au", "Manager", "Test", User.LVL_MANAGER),
        ("analyst@ccg.murdoch.edu.au", "Analyst", "Test", User.LVL_ANALYST),
        ("curator@ccg.murdoch.edu.au", "Curator", "Test", User.LVL_CURATOR),
        ("user@ccg.murdoch.edu.au", "User", "Test", User.LVL_USER),
    ])


def load_titles():
    load_simple_name_list(Title, title)


def load_consent_status():
    load_simple_name_list(ConsentStatus, consent_status)


def load_biobank_sampleclass():
    load_simple_csv(SampleClass, sampleclass_csv)


def load_sample_subtypes_base(csvtext):
    csv = list(map(str.strip, csvtext.split("\n")))

    for i, row in enumerate(filter(bool, csv[1:])):
        cls_name, name = row.split(",", 1)
        cls = SampleClass.objects.get(name=cls_name)
        SampleSubtype.objects.get_or_create(cls=cls, name=name, defaults={"order": i + 1})


def load_sample_subtypes():
    load_sample_subtypes_base(sample_subtypes_csv)


def load_sample_stored_in():
    load_simple_name_list(SampleStoredIn, sample_stored_in)


def load_sample_behaviour():
    load_simple_name_list(SampleBehaviour, sample_behaviour)


def load_sample_treatment():
    load_simple_name_list(SampleTreatment, sample_treatment)


title = """
Mr.
Mrs.
Miss
Ms.
Dr.
"""

consent_status = """
Pending
Consented
Consent Withdrawn
No consent – known patient
No consent – unknown patient
Declined
Not Consented
Not approached
"""

sampleclass_csv = """name,unit,display_unit
Tissue,m,g
Blood,v,mL
Nucleic Acid,v,µL
"""

sample_subtypes_csv = """cls,name
Tissue,Other
Blood,Buffy Coat - EDTA
Blood,Plasma-EDTA
Blood,Serum
Blood,Plasma-ACD
Blood,Buffy Coat - ACD
Blood,Buffy Coat - LH
Blood,Plasma-LH
Blood,Whole Blood - EDTA
Blood,PBMC-EDTA
Blood,Whole Blood - LH
"""

sample_stored_in = """
2mL tube
0.5mL tube
10mL tube
1.2mL tube
Large tube
Paraffin Block
96 well plate
"""

sample_behaviour = """
Normal
Malignant
Benign
"""

sample_treatment = """
Frozen
Formalin Fixed
"""
