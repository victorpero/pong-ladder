import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const selectorSourcePath = new URL("../src/components/LanguageSelector.tsx", import.meta.url);

describe("language selector submission", () => {
  it("keeps each language form mounted while its submit button is clicked", () => {
    const source = ts.createSourceFile(
      selectorSourcePath.pathname,
      readFileSync(selectorSourcePath, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    const languageSubmitButtons: ts.JsxElement[] = [];

    function visit(node: ts.Node) {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === "button") {
        const typeAttribute = node.openingElement.attributes.properties.find(
          (property): property is ts.JsxAttribute =>
            ts.isJsxAttribute(property) && property.name.getText(source) === "type"
        );

        if (typeAttribute?.initializer && ts.isStringLiteral(typeAttribute.initializer)) {
          if (typeAttribute.initializer.text === "submit") {
            languageSubmitButtons.push(node);
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(source);

    expect(languageSubmitButtons).toHaveLength(1);

    for (const button of languageSubmitButtons) {
      const attributeNames = button.openingElement.attributes.properties
        .filter(ts.isJsxAttribute)
        .map((attribute) => attribute.name.getText(source));

      expect(attributeNames).not.toContain("onClick");
    }
  });
});
