import { z } from "zod";

const decimalValueMessage =
  "Informe um valor decimal não negativo com até 10 dígitos inteiros e 2 casas decimais";

const orderFormFieldsSchema = z.object({
  clientId: z.string(),
  responsibleId: z.string(),
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição do serviço")
    .min(3, "A descrição deve ter pelo menos 3 caracteres")
    .max(2000, "A descrição deve ter no máximo 2000 caracteres"),
  value: z
    .string()
    .trim()
    .min(1, "Informe o valor")
    .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/, decimalValueMessage),
  notes: z
    .string()
    .trim()
    .max(4000, "As observações devem ter no máximo 4000 caracteres"),
  status: z.enum(["awaiting", "in-progress", "completed", "cancelled"]),
  visibility: z.enum(["public", "private"]),
});

type OrderFormValues = z.infer<typeof orderFormFieldsSchema>;

function createOrderCreateSchema(requiresResponsible: boolean) {
  return orderFormFieldsSchema.superRefine((data, context) => {
    if (data.clientId === "") {
      context.addIssue({
        code: "custom",
        message: "Selecione um cliente ativo",
        path: ["clientId"],
      });
    }

    if (requiresResponsible && data.responsibleId === "") {
      context.addIssue({
        code: "custom",
        message: "Selecione um responsável ativo",
        path: ["responsibleId"],
      });
    }
  });
}

function createOrderEditSchema(requiresResponsible: boolean) {
  return orderFormFieldsSchema.superRefine((data, context) => {
    if (requiresResponsible && data.responsibleId === "") {
      context.addIssue({
        code: "custom",
        message: "Selecione um responsável ativo",
        path: ["responsibleId"],
      });
    }
  });
}

export { createOrderCreateSchema, createOrderEditSchema };
export type { OrderFormValues };
