function validateGeneral(req, res, next) {
  const detectIssues = (field, value) => {
    if (typeof value !== "string") return null;

    if (/<[^>]*>?/gm.test(value)) {
      return `El campo "${field}" contiene etiquetas HTML no permitidas.`;
    }

    if (/[^a-zA-Z0-9@._\s-]/.test(value)) {
      return `El campo "${field}" contiene símbolos extraños no permitidos.`;
    }

    const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|--|;)\b/i;
    if (sqlKeywords.test(value)) {
      return `El campo "${field}" contiene un posible intento de inyección SQL.`;
    }

    return null;
  };

  const sources = { ...req.body, ...req.query, ...req.params };

  for (const [campo, valor] of Object.entries(sources)) {
    const issue = detectIssues(campo, valor);
    if (issue) {
      return res.status(400).json({ ok: false, error: issue });
    }
  }

  next();
}

module.exports = validateGeneral;