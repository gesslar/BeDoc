import {Data} from "@gesslar/toolkit"

export default Data.deepFreezeObject({
  actionTypes: ["parser", "formatter"],
  actionMetaRequirements: {
    parser: [{kind: "parser"}, "input"],
    formatter: [{kind: "formatter"}, "format"],
  },
})
