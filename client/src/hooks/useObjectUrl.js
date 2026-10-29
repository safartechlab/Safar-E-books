import { useEffect, useState } from "react";

// Turns a File chosen in a file input into a temporary URL, so we can show
// a preview image. The URL is cleaned up automatically.
function useObjectUrl(file) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}

export default useObjectUrl;