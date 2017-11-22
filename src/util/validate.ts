import { SchemaValidator, ValidatorResult, schemas } from '@0xproject/json-schemas';

const { signedOrderSchema } = schemas;
const validator = new SchemaValidator();

const validateEndpointSignedOrderBySchema = (order: any): ValidatorResult => {
  return validator.validate(order, signedOrderSchema);
};

export { validateEndpointSignedOrderBySchema };
