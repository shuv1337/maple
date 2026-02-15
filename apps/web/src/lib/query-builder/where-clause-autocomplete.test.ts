import { describe, expect, it } from "vitest"

import {
  applyWhereClauseSuggestion,
  getWhereClauseAutocomplete,
} from "@/lib/query-builder/where-clause-autocomplete"

describe("where clause autocomplete", () => {
  it("suggests keys at an empty query", () => {
    const result = getWhereClauseAutocomplete({
      expression: "",
      cursor: 0,
      dataSource: "traces",
    })

    expect(result.context).toBe("key")
    expect(result.suggestions.some((item) => item.insertText === "service.name")).toBe(
      true,
    )
  })

  it("suggests operator after a key", () => {
    const expression = "service.name "
    const result = getWhereClauseAutocomplete({
      expression,
      cursor: expression.length,
      dataSource: "logs",
    })

    expect(result.context).toBe("operator")
    expect(result.suggestions.map((item) => item.insertText)).toEqual(["="])
  })

  it("suggests values for the active key", () => {
    const expression = 'service.name = "chec'
    const result = getWhereClauseAutocomplete({
      expression,
      cursor: expression.length,
      dataSource: "traces",
      values: {
        services: ["checkout", "cart"],
      },
    })

    expect(result.context).toBe("value")
    expect(result.key).toBe("service.name")
    expect(result.suggestions[0]?.label).toBe("checkout")
    expect(result.suggestions[0]?.insertText).toBe('"checkout"')
  })

  it("suggests conjunction after a finished value", () => {
    const expression = 'service.name = "checkout" '
    const result = getWhereClauseAutocomplete({
      expression,
      cursor: expression.length,
      dataSource: "traces",
    })

    expect(result.context).toBe("conjunction")
    expect(result.suggestions.map((item) => item.insertText)).toEqual(["AND"])
  })

  it("applies operator suggestion with normalized spacing", () => {
    const expression = "service.name "
    const autocomplete = getWhereClauseAutocomplete({
      expression,
      cursor: expression.length,
      dataSource: "logs",
    })

    const applied = applyWhereClauseSuggestion({
      expression,
      context: autocomplete.context,
      replaceStart: autocomplete.replaceStart,
      replaceEnd: autocomplete.replaceEnd,
      suggestion: autocomplete.suggestions[0],
    })

    expect(applied.expression).toBe("service.name = ")
  })

  it("applies value suggestion with quotes and trailing space", () => {
    const expression = "service.name = che"
    const autocomplete = getWhereClauseAutocomplete({
      expression,
      cursor: expression.length,
      dataSource: "traces",
      values: {
        services: ["checkout"],
      },
    })

    const applied = applyWhereClauseSuggestion({
      expression,
      context: autocomplete.context,
      replaceStart: autocomplete.replaceStart,
      replaceEnd: autocomplete.replaceEnd,
      suggestion: autocomplete.suggestions[0],
    })

    expect(applied.expression).toBe('service.name = "checkout" ')
  })

  it("applies conjunction suggestion with single spacing", () => {
    const expression = 'service.name = "checkout" '
    const autocomplete = getWhereClauseAutocomplete({
      expression,
      cursor: expression.length,
      dataSource: "logs",
    })

    const applied = applyWhereClauseSuggestion({
      expression,
      context: autocomplete.context,
      replaceStart: autocomplete.replaceStart,
      replaceEnd: autocomplete.replaceEnd,
      suggestion: autocomplete.suggestions[0],
    })

    expect(applied.expression).toBe('service.name = "checkout" AND ')
  })
})
