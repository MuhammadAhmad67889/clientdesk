/** A placeholder block shown while content loads. Width and height
 * are whatever the real content will be, so the page does not jump. */
export default function Skeleton({
  height = 16,
  width = "100%",
}: {
  height?: number | string;
  width?: number | string;
}) {
  return <div aria-hidden="true" className="skeleton" style={{ height, width }} />;
}
