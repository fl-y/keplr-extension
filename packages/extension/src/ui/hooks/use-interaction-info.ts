import { useLocation } from "react-router";

import queryString from "querystring";

export const useInteractionInfo = () => {
  const location = useLocation();
  let search = location.search;
  if (search.startsWith("?")) {
    search = search.slice(1);
  }
  const query = queryString.parse(search);

  return {
    interaction: query.interaction === "true",
    interactionInternal: query.interactionInternal === "true"
  };
};
