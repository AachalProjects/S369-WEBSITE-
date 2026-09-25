const S369Gallery = (() => {
  let active = "all",
    shown = 0;
  const batch = 12;
  const thumb = (id) =>
    "https://drive.google.com/thumbnail?id=" +
    encodeURIComponent(id) +
    "&sz=w1600";
  const preview = (id) =>
    "https://drive.google.com/file/d/" + encodeURIComponent(id) + "/preview";
  function filtered() {
    const limits = { celebrity: 4, social: 4, product: 6, models: 4 };
    const curated = Object.entries(limits).flatMap(([folder, limit]) =>
      S369_DRIVE_IMAGES.filter(
        (x) => x.folder === folder && x.mime.startsWith("image/"),
      ).slice(0, limit),
    );
    return active === "all"
      ? curated
      : curated.filter((x) => x.folder === active);
  }
  function card(x, i) {
    const safe = String(x.title).replace(/[<>&"]/g, "");
    if (x.mime.startsWith("image/"))
      return (
        '<figure class="drive-shot ' +
        ((shown + i) % 9 === 0 ? "feature" : "") +
        '"><img src="' +
        thumb(x.id) +
        '" alt="S369 ' +
        x.folder +
        ' image" loading="lazy" referrerpolicy="no-referrer"><figcaption><span>' +
        x.folder +
        "</span><small>" +
        safe +
        "</small></figcaption></figure>"
      );
    if (x.mime.startsWith("video/"))
      return (
        '<figure class="drive-shot drive-video"><iframe src="' +
        preview(x.id) +
        '" title="' +
        safe +
        '" loading="lazy" allow="autoplay; fullscreen" allowfullscreen></iframe><figcaption><span>' +
        x.folder +
        " video</span><small>" +
        safe +
        "</small></figcaption></figure>"
      );
    return (
      '<a class="drive-document" href="' +
      x.url +
      '" target="_blank" rel="noopener"><span>DOCUMENT</span><strong>' +
      safe +
      "</strong><small>" +
      x.folder +
      " · Open in Google Drive →</small></a>"
    );
  }
  function draw(reset = false) {
    if (reset) {
      shown = 0;
      driveGallery.innerHTML = "";
    }
    const items = filtered(),
      next = items.slice(shown, shown + batch);
    driveGallery.insertAdjacentHTML("beforeend", next.map(card).join(""));
    shown += next.length;
    galleryTotal.textContent = items.length + " assets";
    loadMore.hidden = shown >= items.length;
  }
  function init() {
    const groups = ["all", "product", "models", "celebrity", "social"];
    galleryFilters.innerHTML = groups
      .map(
        (x) =>
          '<button data-filter="' +
          x +
          '" class="' +
          (x === "all" ? "active" : "") +
          '">' +
          x.replace(/^./, (c) => c.toUpperCase()) +
          "</button>",
      )
      .join("");
    galleryFilters.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      active = b.dataset.filter;
      galleryFilters
        .querySelectorAll("button")
        .forEach((x) => x.classList.toggle("active", x === b));
      draw(true);
    };
    loadMore.onclick = () => draw();
    draw(true);
  }
  return { init };
})();
