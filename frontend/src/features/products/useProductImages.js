import { useEffect, useRef, useState } from "react";

export function useProductImages() {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    if (!files.length) {
      setPreviewUrls([]);
      return;
    }

    const objectUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function setFromInput(event) {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(selectedFiles);
  }

  function removeAt(indexToRemove) {
    const nextFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(nextFiles);

    if (nextFiles.length === 0 && inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function reset() {
    setFiles([]);
    setPreviewUrls([]);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return {
    inputRef,
    files,
    previewUrls,
    setFiles,
    setFromInput,
    removeAt,
    reset,
  };
}