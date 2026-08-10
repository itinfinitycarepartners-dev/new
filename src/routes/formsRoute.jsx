// src/routes/formsRoute.jsx
// Add this route alongside the existing candidate routes.
// If your router file already imports all pages directly, add only the import
// and <Route> shown here.

import React from "react";
import { Route } from "react-router-dom";
import Forms from "@/pages/Forms";

export const formsRoute = (
  <Route
    path="/forms"
    element={<Forms />}
  />
);

export default formsRoute;