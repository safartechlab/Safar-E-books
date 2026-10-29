const { getCloudinary } = require("../config/cloudinary");

// How files are stored:
//   - Cover images: PUBLIC images. Book.coverImage holds the full https URL
//     (the website already accepts full URLs, so nothing else changes).
//   - PDFs: PRIVATE ("authenticated") files. Nobody can open them from
//     Cloudinary directly. Book.pdfUrl holds "cloudinary:<public_id>", and
//     only the server (pdfController) can download them, after checking
//     that the user is allowed to read the book.
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

// Returns the public https URL of the uploaded cover.
const uploadCover = async (buffer) => {
  const result = await uploadBuffer(buffer, {
    folder: "ebook/covers",
    resource_type: "image",
    type: "upload",
  });
  return result.secure_url;
};

// Returns the reference string to store in Book.pdfUrl.
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

// kind: "cover" | "pdf". Never throws — a failed cleanup must not break
// the request that triggered it. Old local files (/uploads/...) are skipped.
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
  const response = await fetch(url); // Node 18+
  if (!response.ok) throw new Error(`Cloudinary returned ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};

// Downloads a private PDF so the server can send it to an allowed reader.
const getPdfBuffer = async (ref) => {
  const cloud = getCloudinary();
  const publicId = ref.slice(PDF_PREFIX.length);

  // 1) signed delivery URL for the private file
  const signedUrl = cloud.url(publicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
  });

  try {
    return await fetchBuffer(signedUrl);
  } catch (firstError) {
    // 2) fallback: signed API download link
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
