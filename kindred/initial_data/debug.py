import datetime

from ..people.models import Person, Title
from ..contacts.models import ContactDetails, AddressType
from ..contacts.models import PersonAddress, Suburb
from ..sp.models import Doctor, DoctorType
from ..diagnosis.models import BodyPart

deps = ["base"]


def load_data(**kwargs):
    s, _ = Person.objects.get_or_create(
        first_name="Rodney",
        last_name="Smith",
        defaults={"second_name": "Vernon", "dob": datetime.date(1983, 11, 10), "dob_checked": True, "sex": "M"})

    m, _ = Person.objects.get_or_create(
        first_name="Wendy",
        last_name="Smith",
        defaults={"second_name": "Maree", "maiden_name": "Smythe", "dob": datetime.date(1956, 9, 23), "dob_checked": True, "sex": "F"})

    f, _ = Person.objects.get_or_create(
        first_name="Gary",
        last_name="Smith",
        defaults={"second_name": "Wilfrid", "dob": datetime.date(1953, 3, 24), "dob_checked": True, "sex": "M"})

    s.mother = m
    s.father = f
    s.save()

    Person.objects.get_or_create(
        first_name="Chris",
        last_name="Smith",
        defaults={"sex": "M", "mother": m, "father": f, "dob": datetime.date(1985, 4, 12)})

    gm1, _ = Person.objects.get_or_create(
        first_name="Betty",
        last_name="Smith",
        defaults={"second_name": "Gwendoline", "maiden_name": "Vernon", "dob": datetime.date(1930, 5, 24), "dob_checked": False, "sex": "F"})
    gm1.save()

    gf1, _ = Person.objects.get_or_create(first_name="Wilfrid", last_name="Smith", defaults={
        "dob": datetime.date(1922, 1, 1), "dob_checked": False,
        "dod": datetime.date(1972, 1, 1), "dod_checked": False, "sex": "M"})
    gf1.save()

    f.mother = gm1
    f.father = gf1
    f.save()

    Person.objects.get_or_create(first_name="Colin", last_name="Smith", defaults={"dob": datetime.date(1954, 1, 1), "dob_checked": False, "sex": "M", "father": gf1, "mother": gm1})
    Person.objects.get_or_create(first_name="Ann", last_name="Smith", defaults={"dob": datetime.date(1955, 1, 1), "dob_checked": False, "sex": "F", "father": gf1, "mother": gm1})
    Person.objects.get_or_create(first_name="Ian", last_name="Smith", defaults={"dob": datetime.date(1957, 1, 1), "dob_checked": False, "sex": "F", "father": gf1, "mother": gm1})
    Person.objects.get_or_create(first_name="Jennifer", last_name="Smith", defaults={"dob": datetime.date(1958, 1, 1), "dob_checked": False, "sex": "F", "father": gf1, "mother": gm1})

    gm2, _ = Person.objects.get_or_create(first_name="Margaret", last_name="Smythe", defaults={"second_name": "Dorothy", "dob": datetime.date(1930, 1, 1), "dob_checked": False, "sex": "F"})
    gm2.save()
    gf2, _ = Person.objects.get_or_create(first_name="Basil", last_name="Smythe", defaults={"second_name": "Hargrave", "dob": datetime.date(1921, 1, 1), "dob_checked": False, "dod": datetime.date(2011, 10, 1), "dod_checked": False, "sex": "M"})
    gf2.save()

    m.mother = gm2
    m.father = gf2
    m.save()

    v, _ = Person.objects.get_or_create(first_name="Vicky", last_name="Smythe", defaults={"mother": gm2, "father": gf2, "dob": datetime.date(1953, 6, 6), "dob_checked": False, "sex": "F"})
    v.save()

    l, _ = Person.objects.get_or_create(first_name="Lynley", last_name="Smythe", defaults={"mother": gm2, "father": gf2, "dob": datetime.date(1958, 6, 6), "dob_checked": False, "sex": "F"})
    l.save()

    # Add my contact details
    como = Suburb.objects.get(name__iexact="Como", state__abbrev="WA", postcode="6152")
    murdoch = Suburb.objects.get(name__iexact="Murdoch", state__abbrev="WA")
    brentwood = Suburb.objects.get(name__iexact="Brentwood", state__abbrev="WA", postcode="6153")
    home, _ = ContactDetails.objects.get_or_create(address_line1="5/201 Coode St",
                                                   suburb=como, defaults={
                                                       "email": "work@example.com",
                                                       "mobile": "+6199999999",
                                                   })
    work, _ = ContactDetails.objects.get_or_create(address_line1="Centre for Comparative Genomics",
                                                   suburb=murdoch, defaults={
                                                       "email": "rsmith@ccg.murdoch.edu.au",
                                                       "phone_work": "+61893606088",
                                                       "address_line2": "Murdoch University",
                                                       "contact_person": "Rodney Smith",
                                                   })
    AddressType.objects.get_or_create(name="Home", defaults={"order": 1})
    AddressType.objects.get_or_create(name="Work", defaults={"order": 2})
    PersonAddress.objects.get_or_create(person=s, contact=home,
                                        type=AddressType.objects.get(name="Home"))
    PersonAddress.objects.get_or_create(person=s, contact=work,
                                        type=AddressType.objects.get(name="Work"))

    # add doctors
    gp, _ = DoctorType.objects.get_or_create(name="GP", defaults={"order": 1})

    address, _ = ContactDetails.objects.get_or_create(address_line1="Brentwood Village Medical Centre",
                                                      suburb=brentwood,
                                                      defaults={
                                                          "address_line2": "67 Cranford Ave",
                                                          "phone_work": "(08) 9316 8014",
                                                      })
    jasper, _ = Doctor.objects.get_or_create(
        last_name="Example",
        first_name="Doctor",
        defaults={
            "type": gp,
            "active": True,
            "initials": ": D",
            "contact": address,
            "title": Title.objects.get(name="Dr."),
        })
    mark, _ = Doctor.objects.get_or_create(
        last_name="Kelly",
        first_name="Mark",
        defaults={
            "type": gp,
            "active": True,
            "initials": "M K",
            "contact": address,
            "title": Title.objects.get(name="Dr."),
        })

    foot, _ = BodyPart.objects.get_or_create(
        order=1,
        name="Foot")
