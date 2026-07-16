const response =
  await fetch(
    "https://www.imovirtual.com/pt/resultados/comprar/porto?page=1"
  );

const html =
  await response.text();

const match =
  html.match(
    /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );

if (!match) {
  console.log("__NEXT_DATA__ não encontrado.");
  process.exit(1);
}

const nextData =
  JSON.parse(match[1]);

const items =
  nextData?.props?.pageProps?.data?.searchAds?.items;

console.log(
  "Listings:",
  items?.length || 0
);

const firstThree = Array.isArray(items) ? items.slice(0, 3) : [];

firstThree.forEach((item, index) => {
  console.log(`\n===== LISTING ${index + 1} =====`);
  console.log("Object.keys(item):", Object.keys(item || {}));
  console.log("JSON.stringify(item, null, 2):");
  console.log(JSON.stringify(item, null, 2));

  const checks = {
    isPrivateOwner: Object.prototype.hasOwnProperty.call(item || {}, "isPrivateOwner"),
    advertiserType: Object.prototype.hasOwnProperty.call(item || {}, "advertiserType"),
    ownerType: Object.prototype.hasOwnProperty.call(item?.owner || {}, "type"),
    contactDetailsType: Object.prototype.hasOwnProperty.call(item?.contactDetails || {}, "type"),
    posterType: Object.prototype.hasOwnProperty.call(item || {}, "poster_type"),
    userType: Object.prototype.hasOwnProperty.call(item || {}, "user_type")
  };

  console.log("Field presence:", checks);
  console.log("Field values:", {
    isPrivateOwner: item?.isPrivateOwner,
    advertiserType: item?.advertiserType,
    ownerType: item?.owner?.type,
    contactDetailsType: item?.contactDetails?.type,
    posterType: item?.poster_type,
    userType: item?.user_type
  });
});

console.log(
  "PRIVATE:",
  items.filter(i => i.isPrivateOwner === true).length
);

console.log(
  "AGENCY:",
  items.filter(i => i.isPrivateOwner !== true).length
);

console.log(
  items
    .filter(i => i.isPrivateOwner === true)
    .slice(0, 10)
    .map(i => ({
      id: i.id,
      title: i.title,
      private: i.isPrivateOwner
    }))
);