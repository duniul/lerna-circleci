const { withId, withoutId } = require('./globalOptions');

describe('withId', () => {
  it('prepends the id', () => {
    const result = withId('foo', 'bar');
    expect(result).toEqual('foo:bar');
  });

  it('returns the string if no id is passed', () => {
    const result = withId(undefined, 'bar');
    expect(result).toEqual('bar');
  });
});

describe('withoutId', () => {
  it('removes the id and delimiter', () => {
    const result = withoutId('foo', 'foo:bar');
    expect(result).toEqual('bar');
  });

  it('returns the string if no id is passed', () => {
    const result = withoutId(undefined, 'foo:bar');
    expect(result).toEqual('foo:bar');
  });
});
