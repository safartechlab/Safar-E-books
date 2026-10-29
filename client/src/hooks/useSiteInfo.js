import { useEffect, useState } from "react";
import API from "../api/axios";

export const DEFAULT_SITE_INFO = {
  siteName: "SAFAR EBOOKS",
  supportEmail: "",
  contactPhone: "",
  address: "",
  websiteUrl: "",
  copyrightText: "",
};

export const pickSiteInfo = (data = {}) => ({
  siteName: data.siteName || DEFAULT_SITE_INFO.siteName,
  supportEmail: data.supportEmail || "",
  contactPhone: data.contactPhone || "",
  address: data.address || "",
  websiteUrl: data.websiteUrl || "",
  copyrightText: data.copyrightText || "",
});

let cached = null;
let inflight = null;
const listeners = new Set();

const publish = (info) => {
  cached = info;
  listeners.forEach((fn) => fn(info));
};

const load = () => {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = API.get("/settings/public")
      .then((res) => {
        publish(pickSiteInfo(res.data));
        return cached;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

export const refreshSiteInfo = (data) => publish(pickSiteInfo(data));

export default function useSiteInfo() {
  const [info, setInfo] = useState(cached || DEFAULT_SITE_INFO);

  useEffect(() => {
    listeners.add(setInfo);
    load().then((loaded) => {
      if (loaded) setInfo(loaded);
    });
    return () => listeners.delete(setInfo);
  }, []);

  return info;
}
