import DataTable from "./DataTable";

export default function Table({ columns = [], rows = [], emptyMessage = "Sem dados", style, ...props }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyTitle={emptyMessage}
      emptyDescription=""
      style={style}
      {...props}
    />
  );
}
