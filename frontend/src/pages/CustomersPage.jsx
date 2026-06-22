import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Copy,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  RefreshCcw,
  Save,
  Search,
  Star,
  UserRound,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";

import { api } from "../lib/api";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function MetricCard({ title, value, sub, icon: Icon, tone = "green" }) {
  const toneClass = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          {sub && <p className="mt-1 text-xs font-semibold text-slate-500">{sub}</p>}
        </div>

        <div className={`rounded-2xl p-3 ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
      />
    </label>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    province: "",
    district: "",
    ward: "",
    address_detail: "",
    fb_name: "",
    fb_link: "",
    note: "",
  });

  async function loadCustomers() {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await api.refreshCustomers();

      setSummary(data?.summary || null);
      setCustomers(Array.isArray(data?.customers) ? data.customers : []);
    } catch (error) {
      setErrorMessage(error.message || "Không tải được danh sách khách hàng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const keyword = normalizeText(searchText);

    return customers.filter((customer) => {
      if (filter === "repeat" && !customer.is_repeat_customer) return false;
      if (filter === "one_time" && customer.is_repeat_customer) return false;

      if (!keyword) return true;

      const haystack = [
        customer.customer_name,
        customer.customer_phone,
        customer.customer_address,
        customer.fb_name,
        customer.fb_link,
        customer.province,
        customer.district,
        customer.ward,
        customer.address_detail,
        customer.note,
      ]
        .map(normalizeText)
        .join(" ");

      return haystack.includes(keyword);
    });
  }, [customers, filter, searchText]);

  function startEdit(customer) {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingCustomer(customer);

    setEditForm({
      customer_name: customer.customer_name || "",
      customer_phone: customer.customer_phone || "",
      customer_address: customer.customer_address || "",
      province: customer.province || "",
      district: customer.district || "",
      ward: customer.ward || "",
      address_detail: customer.address_detail || "",
      fb_name: customer.fb_name || "",
      fb_link: customer.fb_link || "",
      note: customer.note || "",
    });
  }

  function closeEdit() {
    if (saving) return;

    setEditingCustomer(null);
  }

  function updateForm(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveCustomer() {
    if (!editingCustomer) return;

    if (!editForm.customer_phone.trim()) {
      setErrorMessage("Số điện thoại không được để trống.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      await api.updateCustomer(editingCustomer.customer_phone, editForm);

      setSuccessMessage("Đã cập nhật thông tin khách hàng.");
      setEditingCustomer(null);
      await loadCustomers();
    } catch (error) {
      setErrorMessage(error.message || "Không cập nhật được khách hàng.");
    } finally {
      setSaving(false);
    }
  }

  async function copyPhone(phone) {
    if (!phone) return;

    try {
      await navigator.clipboard.writeText(phone);
      setSuccessMessage("Đã copy số điện thoại.");
    } catch {
      setErrorMessage("Không copy được số điện thoại.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 text-center shadow-sm">
          <Loader2 className="mx-auto animate-spin text-green-700" size={30} />
          <p className="mt-3 text-sm font-bold text-slate-500">
            Đang tải danh sách khách hàng...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-[2rem] bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black text-green-50 ring-1 ring-white/20">
              <UsersRound size={14} />
              Sổ khách hàng
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Khách hàng đã mua
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-green-50/85">
              Quản lý tên, số điện thoại, địa chỉ và thông tin giao hàng của khách.
              Khách mua từ 2 đơn trở lên sẽ được đánh dấu là khách quen.
            </p>
          </div>

          <button
            type="button"
            onClick={loadCustomers}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-green-800 transition hover:bg-green-50"
          >
            <RefreshCcw size={17} />
            Tải lại
          </button>
        </div>
      </section>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-green-700">
          <Star size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm font-semibold">{successMessage}</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Tổng khách đã lưu"
          value={formatNumber(summary?.customer_count)}
          sub="Khách có ít nhất 1 đơn"
          icon={UsersRound}
          tone="green"
        />

        <MetricCard
          title="Khách quen"
          value={formatNumber(summary?.repeat_customer_count)}
          sub="Từ 2 đơn trở lên"
          icon={Star}
          tone="amber"
        />

        <MetricCard
          title="Khách mua 1 lần"
          value={formatNumber(summary?.one_time_customer_count)}
          sub="Cần chăm sóc lại"
          icon={UserRound}
          tone="blue"
        />

        <MetricCard
          title="Tổng chi tiêu"
          value={formatCurrency(summary?.total_spent)}
          sub="Tổng tiền khách đã mua"
          icon={Wallet}
          tone="purple"
        />
      </section>

      <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />

            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tìm theo tên, số điện thoại, địa chỉ, Facebook..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                filter === "all"
                  ? "bg-green-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tất cả
            </button>

            <button
              type="button"
              onClick={() => setFilter("repeat")}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                filter === "repeat"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Khách quen
            </button>

            <button
              type="button"
              onClick={() => setFilter("one_time")}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                filter === "one_time"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              Mua 1 lần
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-100 bg-white p-10 text-center shadow-sm">
            <UsersRound className="mx-auto text-slate-300" size={44} />
            <p className="mt-3 text-base font-black text-slate-700">
              Chưa có khách hàng phù hợp
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Khi bạn tạo đơn và lưu tên/số điện thoại, khách sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <article
              key={customer.customer_phone}
              className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm transition hover:border-green-100 hover:shadow-md sm:p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        customer.is_repeat_customer
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {customer.is_repeat_customer ? "Khách quen" : "Mua 1 lần"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                      {formatNumber(customer.order_count)} đơn
                    </span>
                  </div>

                  <h2 className="mt-3 break-words text-xl font-black text-slate-950">
                    {customer.customer_name || "Khách chưa có tên"}
                  </h2>

                  <div className="mt-3 grid gap-2 text-sm text-slate-600 lg:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => copyPhone(customer.customer_phone)}
                      className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-left font-bold transition hover:bg-slate-100"
                    >
                      <Phone size={16} className="shrink-0 text-green-700" />
                      <span className="break-all">{customer.customer_phone}</span>
                      <Copy size={14} className="ml-auto shrink-0 text-slate-400" />
                    </button>

                    <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 font-semibold">
                      <MapPin size={16} className="mt-0.5 shrink-0 text-green-700" />
                      <span className="break-words">
                        {customer.customer_address || "Chưa có địa chỉ"}
                      </span>
                    </div>
                  </div>

                  {(customer.province ||
                    customer.district ||
                    customer.ward ||
                    customer.address_detail) && (
                    <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="font-black text-slate-400">Tỉnh/TP</p>
                        <p className="mt-1">{customer.province || "—"}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="font-black text-slate-400">Quận/Huyện</p>
                        <p className="mt-1">{customer.district || "—"}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="font-black text-slate-400">Phường/Xã</p>
                        <p className="mt-1">{customer.ward || "—"}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="font-black text-slate-400">Chi tiết</p>
                        <p className="mt-1">{customer.address_detail || "—"}</p>
                      </div>
                    </div>
                  )}

                  {customer.note && (
                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                      Ghi chú: {customer.note}
                    </p>
                  )}
                </div>

                <div className="grid shrink-0 gap-3 sm:grid-cols-3 lg:w-64 lg:grid-cols-1">
                  <div className="rounded-2xl bg-green-50 p-4">
                    <p className="text-xs font-black uppercase text-green-600">
                      Tổng chi tiêu
                    </p>
                    <p className="mt-1 text-lg font-black text-green-800">
                      {formatCurrency(customer.total_spent)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Mua gần nhất
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-700">
                      {formatDate(customer.last_order_at)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => startEdit(customer)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-green-800"
                  >
                    <Pencil size={16} />
                    Sửa thông tin
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-green-700">
                  Chỉnh sửa khách hàng
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  {editingCustomer.customer_name || editingCustomer.customer_phone}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Thay đổi sẽ được cập nhật vào toàn bộ đơn đã lưu của khách này.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="rounded-2xl bg-slate-100 p-3 text-slate-600 transition hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Tên khách"
                value={editForm.customer_name}
                onChange={(value) => updateForm("customer_name", value)}
                placeholder="Ví dụ: Chị Lan"
              />

              <Field
                label="Số điện thoại"
                value={editForm.customer_phone}
                onChange={(value) => updateForm("customer_phone", value)}
                placeholder="Ví dụ: 090..."
              />

              <div className="sm:col-span-2">
                <Field
                  label="Địa chỉ đầy đủ"
                  value={editForm.customer_address}
                  onChange={(value) => updateForm("customer_address", value)}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                />
              </div>

              <Field
                label="Tỉnh/Thành phố"
                value={editForm.province}
                onChange={(value) => updateForm("province", value)}
                placeholder="Ví dụ: TP.HCM"
              />

              <Field
                label="Quận/Huyện"
                value={editForm.district}
                onChange={(value) => updateForm("district", value)}
                placeholder="Ví dụ: Quận 1"
              />

              <Field
                label="Phường/Xã"
                value={editForm.ward}
                onChange={(value) => updateForm("ward", value)}
                placeholder="Ví dụ: Bến Nghé"
              />

              <Field
                label="Địa chỉ chi tiết"
                value={editForm.address_detail}
                onChange={(value) => updateForm("address_detail", value)}
                placeholder="Số nhà, đường..."
              />

              <Field
                label="Tên Facebook"
                value={editForm.fb_name}
                onChange={(value) => updateForm("fb_name", value)}
                placeholder="Tên Facebook nếu có"
              />

              <Field
                label="Link Facebook"
                value={editForm.fb_link}
                onChange={(value) => updateForm("fb_link", value)}
                placeholder="Link Facebook nếu có"
              />

              <div className="sm:col-span-2">
                <Field
                  label="Ghi chú"
                  value={editForm.note}
                  onChange={(value) => updateForm("note", value)}
                  placeholder="Ví dụ: hay mua lan mini, giao buổi tối..."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={saveCustomer}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-5 py-3 text-sm font-black text-white transition hover:bg-green-800 disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
