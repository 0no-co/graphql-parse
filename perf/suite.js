const graphql = require('graphql/language/parser');
const graphqlParse = require('..');

const input = `
  query TestQuery ($id: ID!, $args: [List!]!)
    @description(hello: "world") {
    # some kind of comment
    field
    fieldB
    aliased: field {
      subselection @skip(if: false, otherwise: null)
    }
    test(arg: $id, list: ["Str", "Ha"]) {
      __typename
      id
      subfield {
        ...FragTest
      }
      ... on Type {
        __typename
        id
        imageId
      }
    }
    moreArgs(x: { field: "value" }) {
      id
    }
  }

  fragment FragTest on Type {
    field
  }

  mutation TestMut {
    addField(immediate: true)
  }
`;

const small = `
  query {
    __typename
    id
    subset {
      __typename
      id
      fieldA
      fieldB
    }
    ...Child
  }

  fragment Child on Test {
    id
  }
`;

suite('Parse All Cases', () => {
  benchmark('graphql.js', () => {
    graphql.parse(input);
  });

  benchmark('graphql-parse', () => {
    graphqlParse.parse(input);
  });
});

suite('Parse Small Case', () => {
  benchmark('graphql.js', () => {
    graphql.parse(small);
  });

  benchmark('graphql-parse', () => {
    graphqlParse.parse(small);
  });
});
