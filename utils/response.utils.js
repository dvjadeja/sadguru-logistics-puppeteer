const { AxiosError } = require('axios');
const { ZodError } = require('zod');

const handleSuccess = async (res, resObj) => {
  const { status, ...rest } = resObj;

  console.log({
    responseId: res.locals.responseId,
    method: res.req.method,
    url: res.req.originalUrl,
    body: res.req.body,
    params: res.req.params,
    query: res.req.query,

    code: resObj.code || 'SUCCESS',
    status: status || 200,
    ...rest,
  });

  https: return res.status(status || 200).json({
    code: resObj.code || 'SUCCESS',
    ...rest,
  });
};

const handleAxiosError = (error) => {
  if (!error.response) return null;

  const config = error.response?.config;

  console.log('\n\n\n ------------------------------------------ \n');
  console.log('Config Headers', config?.headers);
  console.log('Config Base URL -', config?.baseURL);
  console.log('Config Endpoint - ', config?.url);
  console.log('Config Data', config?.headers);
  console.log('\n ------------------------------------------ \n\n\n');

  console.log('Data', error.response?.data);

  return { data: error.response?.data };
};

const handleZodErrors = (error) => {
  console.log('Zod Error', error);

  const data = error.issues.map(
    (err) =>
      `${err.path}: expected ${err.expected}, but recieved ${err.recieved}`
  );

  console.log('Error', data);

  return {
    message: 'Error validating request body',
    data,
  };
};

const handleErrors = async (req, res, errObj) => {
  let _error = errObj?.error;

  if (_error instanceof AxiosError) _error = handleAxiosError(errObj.error);

  if (_error instanceof ZodError) _error = handleZodErrors(errObj.error);

  const { status, ...rest } = errObj;

  return res.status(status || 400).json({
    code: 'ERROR',
    data: {
      message: _error?.message || _error,
      query: { ...req.query },
      body: { ...req.body },
      params: { ...req.params },
      data: _error?.data,
    },
    ...rest,
  });
};

module.exports = {
  handleSuccess,
  handleErrors,
  handleAxiosError,
  handleZodErrors,
};
