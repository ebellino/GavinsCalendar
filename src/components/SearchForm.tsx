// Plain GET form: the search state lives in the URL, so results are
// bookmarkable/shareable and the page works even before any client JS loads.
export function SearchForm({
  defaultValues,
}: {
  defaultValues: { keyword?: string; genre?: string; city?: string };
}) {
  return (
    <form className="flex flex-wrap gap-2" action="/" method="get">
      <input
        type="text"
        name="keyword"
        placeholder="Event name..."
        defaultValue={defaultValues.keyword}
        className="border rounded px-3 py-2 flex-1 min-w-40"
      />
      <input
        type="text"
        name="genre"
        placeholder="Genre..."
        defaultValue={defaultValues.genre}
        className="border rounded px-3 py-2 flex-1 min-w-32"
      />
      <input
        type="text"
        name="city"
        placeholder="City..."
        defaultValue={defaultValues.city}
        className="border rounded px-3 py-2 flex-1 min-w-32"
      />
      <button type="submit" className="bg-black text-white rounded px-4 py-2">
        Search
      </button>
    </form>
  );
}
