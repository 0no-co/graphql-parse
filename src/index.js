/**
 * This is a spec-compliant implementation of a GraphQL query language parser,
 * up-to-date with the June 2018 Edition. Unlike the reference implementation
 * in graphql.js it will only parse the query language, but not the schema
 * language.
 */
import match, { parse as makeParser } from 'reghex';

// 2.1.7: Includes commas, and line comments
const ignored = match('ignored')`
  ${/([\s,]|#[^\n\r]+)+/}
`;

// 2.1.9: Limited to ASCII character set, so regex shortcodes are fine
const name = match('Name', x => ({
  kind: x.tag,
  value: x[0]
}))`
  ${/[_\w][_\d\w]*/}
`;

const null_ = match('NullValue', x => ({
  kind: x.tag,
  value: null,
}))`
  ${/null/}
`;

const bool = match('BooleanValue', x => ({
  kind: x.tag,
  value: x === 'true'
}))`
  ${/true|false/}
`;

const variable = match('Variable', x => ({
  kind: x.tag,
  value: x[0]
}))`
  (?: ${/[$]/}) ${name}
`;

// 2.9.6: Technically, this parser doesn't need to check that true, false, and null
// aren't used as enums, but this prevents mistakes and follows the spec closely
const enum_ = match('EnumValue', x => ({
  kind: x.tag,
  value: x[0].value
}))`
  (?! ${/true|false|null/})
  ${name}
`;

// 2.9.1-2: These combine both number values for the sake of simplicity.
// It allows for leading zeroes, unlike graphql.js, which shouldn't matter;
const number = match('Number', x => ({
  kind: x.length === 1 ? 'IntValue' : 'FloatValue',
  value: x.join('')
}))`
  ${/[-]?\d+/}
  ${/[.]\d+/}?
  ${/[eE][+-]?\d+/}?
`;

// 2.9.4: Notably, this skips checks for unicode escape sequences and escaped
// quotes. This is mainly meant for client-side use, so we won't have to be strict.
const string = match('StringValue', x => ({
  kind: x.tag,
  value: x[0]
}))`
  ((?: ${/"""/}) ${/.*(?=""")/} (?: ${/"""/}))
  | ((?: ${/"/}) ${/[^"\r\n]*/} (?: ${/"/}))
`;

const list = match('ListValue', x => ({
  kind: x.tag,
  values: [...x]
}))`
  (?: ${/\[/} ${ignored}?)
  ${value}*
  (?: ${/\]/} ${ignored}?)
`;

const objectField = match('ObjectField', x => ({
  kind: x.tag,
  name: x[0],
  value: x[1]
}))`
  ${name}
  (?: ${ignored} ${/:/} ${ignored})?
  ${value}
  (?: ${ignored})?
`;

const object = match('ObjectValue', x => ({
  kind: x.tag,
  fields: [...x],
}))`
  (?: ${/{/} ${ignored}?)
  ${objectField}*
  (?: ${/}/} ${ignored}?)
`;

// 2.9: This matches the spec closely and is complete
const value = match('value', x => x[0])`
  (
    ${null_}
    | ${bool}
    | ${variable}
    | ${string}
    | ${number}
    | ${enum_}
    | ${list}
    | ${object}
  )
  (?: ${ignored})?
`;

const arg = match('Argument', x => ({
  kind: x.tag,
  name: x[0],
  value: x[1]
}))`
  ${name}
  (?: ${ignored}? ${/:/} ${ignored}?)
  ${value}
`;

const args = match('ArgumentSet')`
  (
    (?: ${/\(/} ${ignored}?)
    ${arg}+
    (?: ${/\)/} ${ignored}?)
  )?
`;

const directive = match('Directive', x => ({
  kind: x.tag,
  name: x[0],
  arguments: [...x[1]]
}))`
  (?: ${/@/}) ${name}
  (?: ${ignored})?
  ${args}?
  (?: ${ignored})?
`;

const directives = match('DirectiveSet')`
  (?: ${ignored})?
  ${directive}*
`;

const field = match('Field', x => {
  let i = 0;
  return {
    kind: x.tag,
    alias: x[1].kind === 'Name' ? x[i++] : undefined,
    name: x[i++],
    arguments: [...x[i++]],
    directives: [...x[i++]],
    selectionSet: x[i++],
  };
})`
  ${name}
  (?: ${ignored})?
  ((?: ${/:/} ${ignored}?) ${name})?
  (?: ${ignored})?
  ${args}
  ${directives}
  ${selectionSet}?
`;

// 2.11: The type declarations may be simplified since there's little room
// for error in this limited type system.
const type = match('Type', x => {
  const node = x[0].kind === 'Name'
    ? { kind: 'NamedType', name: x[0] }
    : { kind: 'ListType', type: x[0] }
  return x[1] === '!'
    ? { kind: 'NonNullType', type: node }
    : node;
})`
  (
    (
      (?: ${/\[/} ${ignored}?)
      ${type}
      (?: ${ignored}? ${/\]/} ${ignored}?)
    ) | ${name}
  )
  ${/!/}?
  (?: ${ignored})?
`;

const typeCondition = match('TypeCondition', x => ({
  kind: 'NamedType',
  name: x[0]
}))`
  (?: ${/on/} ${ignored})
  ${name}
  (?: ${ignored})?
`;

const inlineFragment = match('InlineFragment', x => ({
  kind: x.tag,
  typeCondition: x[0],
  directives: [...x[1]],
  selectionSet: x[2]
}))`
  (?: ${/[.]{3,3}/} ${ignored}?)
  ${typeCondition}
  ${directives}
  ${selectionSet}
`;

const fragmentSpread = match('FragmentSpread', x => ({
  kind: x.tag,
  name: x[0],
  directives: [...x[1]]
}))`
  (?: ${/[.]{3,3}/} ${ignored}?)
  ${name}
  (?: ${ignored})?
  ${directives}
`;

const selectionSet = match('SelectionSet', x => ({
  kind: x.tag,
  selections: [...x],
}))`
  (?: ${/{/} ${ignored}?)
  (
    ${inlineFragment} |
    ${fragmentSpread} |
    ${field}
  )+
  (?: ${/}/} ${ignored}?)
`;

const varDefinitionDefault = match('VariableDefinitionDefault', x => x[0])`
 (?: ${/[=]/} ${ignored}?)
 ${value}
`;

const varDefinition = match('VariableDefinition', x => ({
  kind: x.tag,
  variable: x[0],
  type: x[1],
  defaultValue: !x[2].tag ? x[2] : undefined,
  directives: [...(x[2].tag ? x[2] : x[3])],
}))`
  ${variable}
  (?: ${ignored}? ${/:/} ${ignored}?)
  ${type}
  ${varDefinitionDefault}?
  ${directives}
  (?: ${ignored})?
`;

const varDefinitions = match('VariableDefinitionSet')`
  (?: ${/[(]/} ${ignored}?)
  ${varDefinition}+
  (?: ${/[)]/} ${ignored}?)
`;

const fragmentDefinition = match('FragmentDefinition', x => ({
  kind: x.tag,
  name: x[0],
  typeCondition: x[1],
  directives: [...x[2]],
  selectionSet: x[3],
}))`
  (?: ${/fragment/} ${ignored})
  ${name}
  (?: ${ignored})
  ${typeCondition}
  ${directives}
  ${selectionSet}
`;

const operationDefinition = match('OperationDefinition', x => {
  let i = 1;
  return {
    kind: x.tag,
    operation: x[0],
    name: x.length === 5 ? x[i++] : undefined,
    variableDefinitions: [...(x[i].tag === 'VariableDefinitionSet' ? x[i++] : null)],
    directives: [...x[i++]],
    selectionSet: x[i],
  };
})`
  (?: ${ignored})?
  ${/query|mutation|subscription/}
  ((?: ${ignored}) ${name})?
  (?: ${ignored})?
  ${varDefinitions}?
  ${directives}
  ${selectionSet}
`;

const queryShorthand = match('OperationDefinition', x => ({
  kind: x.tag,
  operation: 'query',
  name: undefined,
  variableDefinitions: [],
  directives: [],
  selectionSet: x[0]
}))`
  (?: ${ignored})?
  ${selectionSet}
`;

const root = match('Document', x => (
  x.length
    ? { kind: x.tag, definitions: [...x] }
    : undefined
))`
  ${queryShorthand}
  | (${operationDefinition} | ${fragmentDefinition})+
`;

export const parse = makeParser(root);
