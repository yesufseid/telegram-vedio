const notFound = (req, res) => {
  return res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
};

module.exports = notFound;