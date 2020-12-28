import { useLocation } from "react-router";

import queryString from "querystring";

export const useInteractionInfo = () => {
  const location = useLocation();
  const query = queryString.parse(location.search);

  return {
    interaction: query.interaction === "true",
    interactionInternal: query.interactionInternal === "true"
  };
};
