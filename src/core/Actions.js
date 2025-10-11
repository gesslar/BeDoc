export default {
  actionTypes: Object.freeze(["parse", "print"]),
  actionMetaRequirements: Object.freeze({
    parse: [{kind: "parse"}, "input"],
    print: [{kind: "print"}, "output"],
  })
}
