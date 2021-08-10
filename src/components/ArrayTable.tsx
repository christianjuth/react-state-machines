export function ArrayTable<T>({
  data,
  columnAlignments,
  renderItem = (data) => data,
  className,
}: {
  data: Array<Array<T>>;
  columnAlignments?: ("left" | "center" | "right" | undefined)[];
  renderItem?: (data: T) => any;
  className?: string;
}) {
  return (
    <table className={className}>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td
                key={j}
                style={{
                  textAlign: columnAlignments?.[j],
                }}
              >
                {renderItem(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
