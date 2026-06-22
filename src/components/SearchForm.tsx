import Link from "next/link";

// Plain GET form: the search state lives in the URL, so results are
// bookmarkable/shareable and the page works even before any client JS loads.
// <datalist> gives native, no-JS autofill suggestions on the text inputs.
export function SearchForm({
  defaultValues,
  cityOptions,
  genreOptions,
}: {
  defaultValues: { keyword?: string; genre?: string; city?: string; startDate?: string; endDate?: string };
  cityOptions: string[];
  genreOptions: string[];
}) {
  return (
    <form className="flex flex-wrap gap-2" action="/" method="get">
      <input
        type="text"
        name="keyword"
        placeholder="Event name..."
        defaultValue={defaultValues.keyword}
        className="border rounded px-3 py-2 flex-1 min-w-40 bg-white text-gray-900"
      />
      <input
        type="text"
        name="genre"
        placeholder="Genre..."
        defaultValue={defaultValues.genre}
        list="genre-options"
        className="border rounded px-3 py-2 flex-1 min-w-32 bg-white text-gray-900"
      />
      <datalist id="genre-options">
        {genreOptions.map((genre) => (
          <option key={genre} value={genre} />
        ))}
      </datalist>
      <input
        type="text"
        name="city"
        placeholder="City..."
        defaultValue={defaultValues.city}
        list="city-options"
        className="border rounded px-3 py-2 flex-1 min-w-32 bg-white text-gray-900"
      />
      <datalist id="city-options">
        {cityOptions.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>
      <label className="flex items-center gap-1 text-sm text-gray-600">
        From
        <input
          type="date"
          name="startDate"
          defaultValue={defaultValues.startDate}
          className="border rounded px-2 py-2 bg-white text-gray-900"
        />
      </label>
      <label className="flex items-center gap-1 text-sm text-gray-600">
        To
        <input
          type="date"
          name="endDate"
          defaultValue={defaultValues.endDate}
          className="border rounded px-2 py-2 bg-white text-gray-900"
        />
      </label>
      <button type="submit" className="bg-black text-white rounded px-4 py-2">
        Search
      </button>
      <Link href="/" className="text-sm text-gray-600 underline self-center">
        Clear filters
      </Link>
    </form>
  );
}
