import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { addToWishlist, removeFromWishlist, getWishlist } from "../api/wishlist";
import { getStoredUser } from "../utils/bookAccess";

let sharedIds = new Set();
let loadedForUser = null;
let inFlight = null;
const listeners = new Set();

const publish = () => listeners.forEach((fn) => fn(new Set(sharedIds)));

const ensureLoaded = (userId) => {
  if (loadedForUser === userId) return;
  if (inFlight) return;

  if (loadedForUser && loadedForUser !== userId) sharedIds = new Set();

  inFlight = getWishlist(userId)
    .then((res) => {
      const list = res.data?.wishlist || [];
      sharedIds = new Set(
        list.filter((item) => item && item.book && item.book._id).map((item) => item.book._id)
      );
      loadedForUser = userId;
      publish();
    })
    .catch(() => {
    
    })
    .finally(() => {
      inFlight = null;
    });
};

export default function useWishlistIds() {
  const userId = getStoredUser()?._id || null;
  const [wishlistIds, setWishlistIds] = useState(() => new Set(sharedIds));

  useEffect(() => {
    listeners.add(setWishlistIds);
    if (userId) ensureLoaded(userId);
    return () => {
      listeners.delete(setWishlistIds);
    };
  }, [userId]);

  const toggleWishlist = useCallback(
    async (bookId) => {
      if (!userId) {
        toast.warning("Please login to manage your wishlist.");
        return;
      }

      const wasWishlisted = sharedIds.has(bookId);

      if (wasWishlisted) sharedIds.delete(bookId);
      else sharedIds.add(bookId);
      publish();

      try {
        if (wasWishlisted) {
          await removeFromWishlist(userId, bookId);
          toast.info("Removed from Favorites");
        } else {
          await addToWishlist(userId, bookId);
          toast.success("Added to Favorites ❤️");
        }
      } catch (err) {
        if (wasWishlisted) sharedIds.add(bookId);
        else sharedIds.delete(bookId);
        publish();
        toast.error("Failed to update wishlist. Please try again.");
      }
    },
    [userId]
  );

  return { wishlistIds, toggleWishlist };
}
