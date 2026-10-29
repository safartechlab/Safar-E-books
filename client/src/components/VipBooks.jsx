import BookShelf from "./BookShelf";

function VipBooks() {
  return (
    <BookShelf
      title=" VIP Access Books"
      subtitle="Unlock these and the whole VIP collection with a subscription."
      access="vip"
      limit={10}
      viewAllTo="/library?access=vip"
      hideWhenEmpty
    />
  );
}

export default VipBooks;
