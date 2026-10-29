
import BookShelf from "./BookShelf";

function NewArrivals() {
  return (
    <BookShelf
      title="New Arrivals"
      subtitle="Discover the latest books added to SAFAR EBOOKS."
      limit={6}
      viewAllTo="/library"
      emptyText="No new arrival books available right now."
    />
  );
}

export default NewArrivals;