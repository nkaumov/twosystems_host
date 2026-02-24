function notFoundHandler(req, res) {
  res.status(404).json({ error: "Маршрут не найден" });
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const payload = { error: error.message || "Внутренняя ошибка сервера" };

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json(payload);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
