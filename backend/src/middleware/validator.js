import Joi from 'joi';

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      error.isJoi = true;
      return next(error);
    }

    req.body = value;
    next();
  };
};

export const schemas = {
  overtimeRequest: Joi.object({
    email: Joi.string().email().required(),
    requestType: Joi.string().valid('Overtime', 'Undertime').required(),
    dateAffected: Joi.date().iso().required(),
    numberOfHours: Joi.number().integer().min(1).max(8).required(),
    minutes: Joi.number().valid(0, 15, 30, 45).required(),
    reason: Joi.string().min(10).max(500).required(),
    projectTaskAssociated: Joi.string().min(3).max(200).required()
  })
};
