/* description: Parses search expressions. */
/* compile with ./node_modules/.bin/jison js/search/parser.ji -o js/search/parser.js */


/* lexical grammar */
%lex
%options case-insensitive
%x daterange
%x quoted
%%

["]                   this.begin('quoted')
<quoted>[^"\n]+       return 'QUOTED'
<quoted>[\n]          return 'NEWLINE_IN_STRING';
<quoted><<EOF>>       return 'EOF_IN_STRING';
<quoted>["]           this.popState();
\n                    return 'NEWLINE'
"AND"                 return 'AND'
"OR"                  return 'OR'
"NOT"                 return 'NOT'
"("                   return '('
")"                   return ')'
<daterange>[0-9]{4}   return 'DATENUMBER4'
<daterange>[0-9]{1,2} return 'DATENUMBER2'
<daterange>"/"        return '/'
<daterange>"-"        return '-'
<daterange>\s         this.popState();
[a-z_]+[a-z0-9_]*":"  return 'FIELDNAME'
[a-z_]+[a-z0-9_]*"."  return 'FIELDNAMEPART'
":"                   return 'COLON'
[^\s()]+              return 'SEARCHTERM'
\s+                   return 'SP'
<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */

%left 'OR'
%left 'AND'
%left 'NOT'

%start startnl

%% /* language grammar */

start
    : EOF
        { return null; }
    | expression EOF
        { return $1; }
    ;

startnl
    : EOF
        { return []; }
    | startnls EOF
        { return $1; }
    ;

blank: NEWLINE NEWLINE;

startnls
    : blank
        { $$ = []; }
    | expression blank
        { $$ = [$1]; }
    | startnls expression blank
        { $$ = $1; $1.push($2); }
    ;

sp: 'SP';

msp
    : /* empty */
    | sp
    ;

/*
// fixme: would like to use the following clauses to make AND higher
// precedence than OR. However I can't figure out how to avoid the
// conflict
expression
    : expression sp 'OR' sp term
        {$$ = { or: [$1, $5] };}
    | term
    ;

term
    : term sp 'AND' sp factor
        {$$ = { and: [$1, $5] };}
    | term sp factor
        {$$ = { and: [$1, $3] };}
    | factor
    ;
*/

expression
    : expression sp 'OR' sp factor
        {$$ = { or: [$1, $5] };}
    | expression sp factor
        {$$ = { and: [$1, $3] };}
    | expression sp 'AND' sp factor
        {$$ = { and: [$1, $5] };}
    | factor
    ;

factor
    : keyword
    | field
    | 'NOT' sp factor
        {$$ = { not: $3 };}
    | '(' msp expression msp ')'
        {$$ = $3;}
    ;

field
    : fieldspec mcolon fieldvalue
       { $1 = _.map($1, function(s) { return s.slice(0, -1).toLowerCase(); }); $$ = { name: $1, value: $3, exact: !!$2 }; }
    | fieldspec '(' msp expression msp ')'
       /* in future we could search within a related field using this syntax */
       { $1 = _.map($1, function(s) { return s.slice(0, -1).toLowerCase(); }); $$ = { name: $1, expr: $4 }; }
    | 'alive' yesno
         {$$ = { name: 'alive', value: $2 };}
    | 'deceased' yesno
         {$$ = { name: 'deceased', value: $2 };}
    | 'AC_FIELD'
    ;

fieldspec
    : 'FIELDNAME'
       { $$ = [$1]; }
    | fieldparts 'FIELDNAME'
       { $$ = $1; $1.push($2); }
    ;

fieldparts
    : 'FIELDNAMEPART'
        { $$ = [$1]; }
    | fieldparts 'FIELDNAMEPART'
        { $$ = $1; $1.push($2); }
    | fieldparts 'AC_FIELDPARTS'
    ;


mcolon
    : /* empty */
    | 'COLON'
    ;

yesno
    : 'TRUE'
        {$$ = true;}
    | 'FALSE'
        {$$ = false;}
    |
        {$$ = null;}
    ;

keyword
    : 'QUOTED'
    | date
    | NUMBER
        {$$ = Number(yytext);}
    | 'SEARCHTERM'
    ;

/* fixme: allow multiple things together like
   NUMBER '/' NUMBER '/' NUMBER
   */
fieldvalue
    : /* empty */
      { $$ = null; }
    | keyword
    | AC_FIELDVALUE
    ;

date
    : 'DATE' daterange
        { $$ = { name: $1.substr(0, $1.length-1), value: $2 }; }
    ;

daterange
    : datespecslash '-' datespecslash
        { $$ = { start: $1, end: $3 }; }
    | datespecslash '-'
        { $$ = { start: $1 }; }
    | '-' datespecslash
        { $$ = { end: $2 }; }
    | datespec
        { $$ = { start: $1, end: $1 }; }
    ;

datespec
    : datespecslash
    /*| datespecdash*/
    ;

datenumber2
    : DATENUMBER2
        { $$ = parseInt($1, 10); }
    ;

datenumber4
    : DATENUMBER4
        { $$ = parseInt($1, 10); }
    ;

datespecslash
    : datenumber2 "/" datenumber2 "/" datenumber4
      { $$ = { day: $1, month: $3 - 1, year: $5 }; }
    | datenumber2 "/" datenumber4
      { $$ = { month: $1 - 1, year: $3 }; }
    | datenumber4
      { $$ = { year: $1 }; }
    ;

datespecdash
    : datenumber4 "-" datenumber2 "-" datenumber2
      { $$ = { year: $1, month: $3 - 1, day: $5 }; }
    ;
