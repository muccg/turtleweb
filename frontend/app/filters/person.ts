module kindred {
  'use strict';

  angular.module("kindred.filters.person", [])
    .filter('personAge', function() {
      return function(person, from_date) {
        if (person) {
          if (!person.dob) {
            return 'unborn';
          }

          var fmt = 'YYYY-MM-DD';

          var start = moment(person.dob, fmt);
          var end;
          if (from_date) {
            end = moment(from_date, fmt);
          } else if (person.dod) {
            end = moment(person.dod, fmt);
          } else {
            end = moment();
          }
          // end.diff() will round down by default - which is what you want,
          // you don't round your age up
          return moment.duration(end.diff(start, 'years')) + ' years old';
        }
        return '';
      };
    })
    .filter('personFullName', function() {
      return function(person, middle) {
        var parts = [];
        if (person) {
          if (person.first_name) {
            parts.push(person.first_name);
          }
          if (middle && person.second_name) {
            parts.push(person.second_name);
          }
          if (person.last_name) {
            parts.push(person.last_name);
          }
          if (parts.length === 0) {
            parts.push('No name');
          }
        }
        return parts.join(' ');
      };
    })
    .filter('personFormalName', function() {
      return function(person, empty, middle) {
        var parts = [];
        if (person) {
          if (person.last_name) {
            parts.push(person.last_name +
                       ((person.first_name ||
                         (middle && person.second_name)) ? ',' : ''));
          }
          if (person.first_name) {
            parts.push(person.first_name);
          }
          if (middle && person.second_name) {
            parts.push(person.second_name);
          }
          if (parts.length === 0) {
            parts.push(empty === undefined ? 'No name' : '');
          }
        }
        return parts.join(' ');
      };
    })
    .filter('personTitleName', ['$filter', function($filter) {
      var formalName = $filter('personFormalName');
      return function(person, empty, middle) {
        var name = formalName(person, empty, middle);
        if (person.title && person.title.name) {
          name = person.title.name + ' ' + name;
        }
        return name;
      };
    }])
    .filter('personTitle', function() {
      return function(person) {
        return person && person.title && person.title.name ? person.title.name : "";
      };
    })
    .filter('staffName', ['$filter', function($filter) {
      return function(person) {
        if (person) {
          var initial = person.first_name ? (person.first_name[0] + ".") : null;
          var no_name = person.first_name && person.last_name ? null : "No name";
          return _([person.title ? person.title.name : null,
                    initial, person.last_name,
                    no_name]).compact().join(" ");
        } else {
          return "";
        }
      };
    }])
    .filter('personAlias', function() {
      return function(person) {
        if (person) {
          return person.other_name;
        }
      };
    })
    .filter('personSex', function() {
      return function(person) {
        if (person) {
          var sex = (person.sex || "").substr(0, 1).toUpperCase();
          return sex === "M" ? "Male" : sex === "F" ? "Female" : "Unknown";
        }
        return "";
      };
    })
    .filter('personContactAddress', function() {
      return function(person) {
        return [person.contact.address_line1, person.contact.address_line2,
                person.contact.address_line3, person.contact.address_line4]
          .filter(function(addr) {return addr});
      };
    })
    .filter('personSelectLabel', function($filter) {
      return function(person) {
        if (!person) {
          return "";
        }
        var fullname = $filter('personFullName')(person);
        var address = $filter('personContactAddress')(person);
        var label = [fullname, address].join(', ');
        if (label.length >= 67) {
          label = label.slice(0, 63) + '...';
        }
        return label;
      };
    });

  export interface PersonFullNameFilter {
    (person: Models.Person, middle?: boolean): string;
  }
}
