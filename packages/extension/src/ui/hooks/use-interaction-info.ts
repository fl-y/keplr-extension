import { useLocation } from "react-router";

import queryString from "querystring";

import { disableScroll, fitPopupWindow } from "@keplr/popup";
import { useEffect } from "react";

export const useInteractionInfo = () => {
  const location = useLocation();
  let search = location.search;
  if (search.startsWith("?")) {
    search = search.slice(1);
  }
  const query = queryString.parse(search);

  const result = {
    interaction: query.interaction === "true",
    interactionInternal: query.interactionInternal === "true"
  };

  useEffect(() => {
    if (result.interaction && !result.interactionInternal) {
      disableScroll();
      fitPopupWindow();
    }
  }, [result.interaction, result.interactionInternal]);

  return result;
};
