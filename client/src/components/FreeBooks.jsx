import BookShelf from "./BookShelf";

// Books anyone can read for free.
function FreeBooks() {
  return (
    <BookShelf
      title="Free Books"
      subtitle="Start reading right away — no payment needed."
      access="free"
      limit={10}
      viewAllTo="/library?access=free"
      hideWhenEmpty
    />
  );
}

export default FreeBooks;
