const { getCloudinary } = require("../config/cloudinary");
const PDF_PREFIX = "cloudinary:";
const COVER_URL_RE =
  /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+?)\.[a-z0-9]+$/i;

const isCloudinaryPdfRef = (ref) => typeof ref === "string" && ref.startsWith(PDF_PREFIX);

const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });

const uploadCover = async (buffer) => {
  const result = await uploadBuffer(buffer, {
    folder: "ebook/covers",
    resource_type: "image",
    type: "upload",
  });
  return result.secure_url;
};

const uploadPdf = async (buffer) => {
  const publicId = `ebook/pdfs/${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`;
  await uploadBuffer(buffer, {
    public_id: publicId,
    resource_type: "raw",
    type: "authenticated",
    overwrite: false,
  });
  return `${PDF_PREFIX}${publicId}`;
};

const deleteStoredFile = async (ref, kind) => {
  try {
    if (!ref) return;
    const cloud = getCloudinary();
    if (kind === "pdf" && isCloudinaryPdfRef(ref)) {
      await cloud.uploader.destroy(ref.slice(PDF_PREFIX.length), {
        resource_type: "raw",
        type: "authenticated",
        invalidate: true,
      });
    } else if (kind === "cover") {
      const match = COVER_URL_RE.exec(ref);
      if (match) {
        await cloud.uploader.destroy(match[1], { resource_type: "image", invalidate: true });
      }
    }
  } catch (err) {
    console.log("Cloudinary cleanup failed:", err.message);
  }
};

const fetchBuffer = async (url) => {
  const response = await fetch(url); 
  if (!response.ok) throw new Error(`Cloudinary returned ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};

const getPdfBuffer = async (ref) => {
  const cloud = getCloudinary();
  const publicId = ref.slice(PDF_PREFIX.length);

  const signedUrl = cloud.url(publicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
  });

  try {
    return await fetchBuffer(signedUrl);
  } catch (firstError) {

    const apiUrl = cloud.utils.private_download_url(publicId, "", {
      resource_type: "raw",
      type: "authenticated",
    });
    try {
      return await fetchBuffer(apiUrl);
    } catch (secondError) {
      throw new Error(
        `Could not download PDF from Cloudinary (${firstError.message}; ${secondError.message})`
      );
    }
  }
};

module.exports = {
  uploadCover,
  uploadPdf,
  deleteStoredFile,
  getPdfBuffer,
  isCloudinaryPdfRef,
};
