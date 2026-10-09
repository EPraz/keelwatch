import type {
  OpenAPIObject,
  ReferenceObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

// This endpoint's generated web response type is checked against its actual
// published schema. No runtime dependency or backend source import reaches web.
export function openApiResponseType(document: OpenAPIObject, path: string) {
  function render(schema: SchemaObject | ReferenceObject): string {
    if ('$ref' in schema) {
      const name = schema.$ref.split('/').at(-1)!;
      const referenced = document.components?.schemas?.[name];
      if (!referenced) throw new Error(`Missing OpenAPI response schema: ${name}`);
      return render(referenced);
    }
    let type: string;
    if (schema.allOf) type = schema.allOf.map(render).join(' & ');
    else if (schema.enum)
      type = schema.enum.map((value: unknown) => JSON.stringify(value)).join(' | ');
    else if (schema.type === 'array' && schema.items)
      type = `readonly (${render(schema.items)})[]`;
    else if (schema.type === 'object' || schema.properties) {
      type = `{ ${Object.entries(schema.properties ?? {})
        .map(
          ([name, property]) =>
            `readonly ${name}${schema.required?.includes(name) ? '' : '?'}: ${render(property)};`,
        )
        .join(' ')} }`;
    } else if (schema.type === 'string') type = 'string';
    else if (schema.type === 'integer' || schema.type === 'number') type = 'number';
    else if (schema.type === 'boolean') type = 'boolean';
    else
      throw new Error(
        `Unsupported evaluation response schema type: ${String(schema.type)}`,
      );
    return schema.nullable ? `${type} | null` : type;
  }
  const operation = document.paths[path]?.get;
  const response = operation?.responses['200'];
  if (!response || '$ref' in response) throw new Error('Missing evaluation response.');
  const schema = response.content?.['application/json']?.schema;
  if (!schema) throw new Error('Missing JSON evaluation response schema.');
  return render(schema);
}

export function requirementEvaluationContract(document: OpenAPIObject) {
  const type = openApiResponseType(
    document,
    '/api/v1/vessels/{vesselId}/crew-assignments/requirement-evaluation',
  );
  return `// Generated from the evaluation OpenAPI response; do not edit manually.\n// Checked by requirement-evaluation.postgres.integration.spec.ts.\nexport type RequirementEvaluation = ${type};\nexport type EvaluationStatus = RequirementEvaluation['status'];\n`;
}
