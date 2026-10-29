import API from "./axios";

export const addToWishlist = (userId, bookId) => {
    return API.post("/wishlist/add", {
        book: bookId,
    });
};

export const removeFromWishlist = (userId, bookId) => {
    return API.delete(`/wishlist/remove/${bookId}`);
};

export const getWishlist = (userId) => {
    return API.get(`/wishlist`);
};

export const checkWishlist = (userId, bookId) => {
    return API.get(`/wishlist/check/${bookId}`);
};