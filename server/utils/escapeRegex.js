// Escapes characters that have special meaning in a regular expression, so
// user-supplied search text can be safely dropped into `new RegExp(...)` or
// a Mongo `$regex` query without two problems:
//   1. ReDoS — a crafted pattern (e.g. lots of nested quantifiers) causing a
//      pathologically slow match.
//   2. Regex injection — a search box behaving like an unintended regex
//      instead of a literal text search (e.g. searching "." matching
//      every character instead of a literal dot).
//
// After escaping, the input is always matched as literal text, which is
// exactly what a "search books/messages/reviews by text" box should do.
const escapeRegex = (string = "") => {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

module.exports = escapeRegex;