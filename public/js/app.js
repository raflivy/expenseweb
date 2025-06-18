function expenseTracker() {
  return {
    // Authentication
    isAuthenticated: false,
    authToken: localStorage.getItem('authToken') || null,
    password: "",
    loading: false,
    error: "",

    // Navigation and Theme
    activeTab: "home",
    isDarkMode: false,

    // Modals
    showAddModal: false,
    showBudgetModal: false,
    showCategoryModal: false,
    showSourceModal: false,
    showPasswordModal: false,

    // Data
    expenses: [],
    categories: [],
    sources: [],
    monthlyBudget: 0,
    monthlySpent: 0,
    todaySpent: 0,
    weeklySpent: 0,

    // Forms
    expenseForm: {
      title: "",
      description: "",
      amount: "",
      date: "",
      categoryId: "",
      sourceId: "",
    },

    budgetForm: {
      amount: "",
    },

    categoryForm: {
      name: "",
      color: "#3B82F6",
      icon: "💰",
    },

    sourceForm: {
      name: "",
      color: "#10B981",
      icon: "🏦",
    },

    passwordForm: {
      current: "",
      new: "",
      confirm: "",
    },

    // Editing states
    editingExpense: null,
    editingCategory: null,
    editingSource: null,

    // Date filter
    dateFilter: {
      start: "",
      end: "",
    },

    // Chart
    monthlyChart: null,

    // Theme settings
    isDarkMode: false,

    // Initialization
    async init() {
      console.log("Initializing expense tracker...");
      await this.checkAuth();
      this.loadTheme();
    },    // Check authentication status on app load (no timeout, persistent until logout)
    async checkAuth() {
      console.log("Checking authentication status...");
      
      if (!this.authToken) {
        console.log("No token found, user not authenticated");
        this.isAuthenticated = false;
        return;
      }

      console.log("Token found, verifying with server...");
      try {
        const response = await fetch("/api/auth/status", {
          headers: {
            "X-Auth-Token": this.authToken
          }
        });
        
        if (!response.ok) {
          console.log("Auth check response not ok:", response.status);
          this.isAuthenticated = false;
          return;
        }
        
        const data = await response.json();
        console.log("Auth check response:", data);

        if (data.authenticated) {
          this.isAuthenticated = true;
          console.log("Authentication verified - token is valid");
          await this.loadDataAfterLogin();
        } else {
          // Only clear token if server says it's invalid, not because of timeout
          console.log("Token invalid according to server, clearing authentication");
          this.authToken = null;
          localStorage.removeItem('authToken');
          this.isAuthenticated = false;
        }
      } catch (error) {
        console.error("Auth check network error:", error);
        // Don't clear token on network errors, just set as not authenticated for now
        this.isAuthenticated = false;
      }
    },

    // Authentication methods
    async login() {
      this.loading = true;
      this.error = "";

      try {        const response = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: this.password }),
        });
        const data = await response.json();        if (response.ok && data.success) {
          this.authToken = data.token;
          localStorage.setItem('authToken', data.token);
          this.isAuthenticated = true;
          this.password = "";
          console.log("Login successful - token:", data.token.substring(0, 20) + "...");
          
          // Load data directly without requireAuth check since we just logged in
          await this.loadDataAfterLogin();
          notifications.success("Login berhasil! Token akan tetap aktif hingga logout.");
        } else {
          this.error = data.error || "Login failed";
          notifications.error(this.error);
        }
      } catch (error) {
        this.error = "Connection error: " + error.message;
        notifications.error(
          "Gagal terhubung ke server. Periksa koneksi internet dan coba lagi."
        );
      } finally {
        this.loading = false;
      }
    },    async logout() {
      if (this.authToken) {
        try {
          await fetch("/api/logout", {
            method: "POST",
            headers: {
              "X-Auth-Token": this.authToken
            }
          });
          console.log("Logout successful");
        } catch (error) {
          console.error("Logout request failed:", error);
        }
      }
      this.authToken = null;
      localStorage.removeItem('authToken');
      this.isAuthenticated = false;
      this.expenses = [];
      this.categories = [];
      this.sources = [];
      notifications.success("Logout berhasil!");
    },
    async changePassword() {
      if (this.passwordForm.new !== this.passwordForm.confirm) {
        if (window.notifications) {
          notifications.error("Password baru tidak cocok");
        } else {
          alert("Password baru tidak cocok");
        }
        return;
      }

      this.loading = true;

      try {
        const response = await fetch("/api/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword: this.passwordForm.current,
            newPassword: this.passwordForm.new,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          if (window.notifications) {
            notifications.success(data.message || "Password berhasil diubah");
          } else {
            alert(data.message || "Password berhasil diubah");
          }

          this.showPasswordModal = false;
          this.passwordForm = { current: "", new: "", confirm: "" };

          // Tanya user apakah ingin restart server untuk efek penuh
          const shouldRestart = confirm(
            "Password telah diubah. Restart server untuk efek penuh?"
          );
          if (shouldRestart) {
            try {
              await fetch("/api/restart", { method: "POST" });
              if (window.notifications) {
                notifications.info("Server akan restart dalam 2 detik...");
              }

              // Redirect ke halaman login setelah restart
              setTimeout(() => {
                window.location.reload();
              }, 3000);
            } catch (restartError) {
              console.log("Manual restart required");
            }
          }
        } else {
          if (window.notifications) {
            notifications.error(data.error || "Gagal mengubah password");
          } else {
            alert(data.error || "Gagal mengubah password");
          }
        }
      } catch (error) {
        if (window.notifications) {
          notifications.error("Connection error");
        } else {
          alert("Connection error");
        }
      } finally {
        this.loading = false;
      }
    },

    // Data loading methods
    async loadData() {
      if (!this.requireAuth()) return;

      await Promise.all([
        this.loadExpenses(),
        this.loadCategories(),
        this.loadSources(),
        this.loadBudget(),
      ]);

      this.calculateSummaries();
      this.updateChart();
    },

    async loadDataAfterLogin() {
      console.log("Loading data after successful login...");
      try {
        await Promise.all([
          this.loadExpenses(),
          this.loadCategories(),
          this.loadSources(),
          this.loadBudget(),
        ]);

        this.calculateSummaries();
        this.updateChart();
        console.log("Data loaded successfully after login");
      } catch (error) {
        console.error("Error loading data after login:", error);
      }
    },

    async loadExpenses() {
      const response = await this.apiCall("/api/expenses");
      if (response && response.ok) {
        this.expenses = await response.json();
      }
    },

    async loadCategories() {
      const response = await this.apiCall("/api/categories");
      if (response && response.ok) {
        this.categories = await response.json();
      }
    },
    async loadSources() {
      const response = await this.apiCall("/api/sources");
      if (response && response.ok) {
        this.sources = await response.json();
      }
    },

    async loadBudget() {
      const now = new Date();
      const response = await this.apiCall(
        `/api/budget/${now.getFullYear()}/${now.getMonth() + 1}`
      );
      if (response && response.ok) {
        const budget = await response.json();
        this.monthlyBudget = parseFloat(budget.amount) || 0;
        this.budgetForm.amount = this.monthlyBudget;
      }
    },

    // Expense methods
    async submitExpense() {
      if (!this.requireAuth()) return;

      this.loading = true;

      try {
        const url = this.editingExpense
          ? `/api/expenses/${this.editingExpense.id}`
          : "/api/expenses";
        const method = this.editingExpense ? "PUT" : "POST";

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.expenseForm),
        });
        if (response.ok) {
          await this.loadExpenses();
          this.calculateSummaries();
          this.updateChart();
          this.closeAddModal();
          notifications.success(
            this.editingExpense
              ? "Pengeluaran berhasil diperbarui!"
              : "Pengeluaran berhasil ditambahkan!"
          );
        } else {
          const data = await response.json();
          notifications.error(data.error || "Gagal menyimpan pengeluaran");
        }
      } catch (error) {
        alert("Connection error");
      } finally {
        this.loading = false;
      }
    },

    async deleteExpense(id) {
      if (!this.requireAuth()) return;
      if (!confirm("Hapus pengeluaran ini?")) return;

      try {
        const response = await this.apiCall(`/api/expenses/${id}`, {
          method: "DELETE",
        });

        if (response && response.ok) {
          await this.loadExpenses();
          this.calculateSummaries();
          this.updateChart();
          this.closeAddModal();
          notifications.success("Pengeluaran berhasil dihapus!");
        } else {
          notifications.error("Gagal menghapus pengeluaran");
        }
      } catch (error) {
        notifications.error("Connection error");
      }
    },

    editExpense(expense) {
      this.editingExpense = expense;
      this.expenseForm = {
        title: expense.title,
        description: expense.description || "",
        amount: expense.amount,
        date: expense.date.split("T")[0],
        categoryId: expense.categoryId,
        sourceId: expense.sourceId,
      };
      this.showAddModal = true;
    },

    closeAddModal() {
      this.showAddModal = false;
      this.editingExpense = null;
      this.expenseForm = {
        title: "",
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        categoryId: "",
        sourceId: "",
      };
    },

    // Budget methods
    async saveBudget() {
      if (!this.requireAuth()) return;
      this.loading = true;

      try {
        const now = new Date();
        const response = await fetch("/api/budget", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            amount: this.budgetForm.amount,
          }),
        });
        if (response.ok) {
          this.monthlyBudget = parseFloat(this.budgetForm.amount);
          this.showBudgetModal = false;
          notifications.success("Budget berhasil disimpan!");
        } else {
          notifications.error("Gagal menyimpan budget");
        }
      } catch (error) {
        alert("Connection error");
      } finally {
        this.loading = false;
      }
    },

    // Category methods
    async saveCategory() {
      if (!this.requireAuth()) return;
      this.loading = true;

      try {
        const url = this.editingCategory
          ? `/api/categories/${this.editingCategory.id}`
          : "/api/categories";
        const method = this.editingCategory ? "PUT" : "POST";

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.categoryForm),
        });

        if (response.ok) {
          await this.loadCategories();
          this.resetCategoryForm();
        } else {
          const data = await response.json();
          alert(data.error || "Gagal menyimpan kategori");
        }
      } catch (error) {
        alert("Connection error");
      } finally {
        this.loading = false;
      }
    },

    async deleteCategory(id) {
      if (!this.requireAuth()) return;
      if (!confirm("Hapus kategori ini?")) return;

      try {
        const response = await fetch(`/api/categories/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await this.loadCategories();
        } else {
          alert("Gagal menghapus kategori");
        }
      } catch (error) {
        alert("Connection error");
      }
    },

    editCategory(category) {
      this.editingCategory = category;
      this.categoryForm = {
        name: category.name,
        color: category.color,
        icon: category.icon,
      };
    },

    resetCategoryForm() {
      this.editingCategory = null;
      this.categoryForm = {
        name: "",
        color: "#3B82F6",
        icon: "💰",
      };
    },

    // Source methods
    async saveSource() {
      if (!this.requireAuth()) return;
      this.loading = true;

      try {
        const url = this.editingSource
          ? `/api/sources/${this.editingSource.id}`
          : "/api/sources";
        const method = this.editingSource ? "PUT" : "POST";

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.sourceForm),
        });

        if (response.ok) {
          await this.loadSources();
          this.resetSourceForm();
        } else {
          const data = await response.json();
          alert(data.error || "Gagal menyimpan sumber dana");
        }
      } catch (error) {
        alert("Connection error");
      } finally {
        this.loading = false;
      }
    },

    async deleteSource(id) {
      if (!this.requireAuth()) return;
      if (!confirm("Hapus sumber dana ini?")) return;

      try {
        const response = await fetch(`/api/sources/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await this.loadSources();
        } else {
          alert("Gagal menghapus sumber dana");
        }
      } catch (error) {
        alert("Connection error");
      }
    },

    editSource(source) {
      this.editingSource = source;
      this.sourceForm = {
        name: source.name,
        color: source.color,
        icon: source.icon,
      };
    },

    resetSourceForm() {
      this.editingSource = null;
      this.sourceForm = {
        name: "",
        color: "#10B981",
        icon: "🏦",
      };
    },

    // Navigation methods
    setActiveTab(tab) {
      if (!this.requireAuth() && tab !== "home") return;
      this.activeTab = tab;

      // Update navbar and body styling
      this.$nextTick(() => {
        const navbar = document.querySelector(".modern-navbar");
        const body = document.body;
        const follow = document.querySelector(".modern-navbar li.follow");

        if (navbar && body) {
          // Remove all style classes
          navbar.classList.remove("home-style", "add-style", "reports-style");
          body.classList.remove("home-style", "add-style", "reports-style");

          // Add new style class
          const styleClass = `${tab}-style`;
          navbar.classList.add(styleClass);
          body.classList.add(styleClass);

          // Update follow position
          const activeTab = document.querySelector(`.modern-navbar .${tab}`);
          if (activeTab && follow) {
            const rect = activeTab.getBoundingClientRect();
            const navRect = navbar.getBoundingClientRect();
            const relativeLeft = rect.left - navRect.left + rect.width / 2 - 30;
            follow.style.left = `${relativeLeft}px`;
          }
        }
      });
    },

    // Calculation methods
    calculateSummaries() {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeek = new Date(
        now.getTime() - now.getDay() * 24 * 60 * 60 * 1000
      );

      this.monthlySpent = this.expenses
        .filter((expense) => new Date(expense.date) >= thisMonth)
        .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

      this.todaySpent = this.expenses
        .filter((expense) => {
          const expenseDate = new Date(expense.date);
          return expenseDate.toDateString() === today.toDateString();
        })
        .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

      this.weeklySpent = this.expenses
        .filter((expense) => new Date(expense.date) >= thisWeek)
        .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    },

    // Chart methods
    updateChart() {
      this.$nextTick(() => {
        const ctx = document.getElementById("monthlyChart");
        if (!ctx) return;

        if (this.monthlyChart) {
          this.monthlyChart.destroy();
        }

        const monthlyData = this.getMonthlyChartData();

        this.monthlyChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ],
            datasets: [
              {
                label: "Pengeluaran",
                data: monthlyData,
                borderColor: "#3B82F6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                tension: 0.4,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function (value) {
                    return "Rp " + new Intl.NumberFormat("id-ID").format(value);
                  },
                },
              },
            },
          },
        });
      });
    },

    getMonthlyChartData() {
      const now = new Date();
      const currentYear = now.getFullYear();
      const data = new Array(12).fill(0);

      this.expenses.forEach((expense) => {
        const expenseDate = new Date(expense.date);
        if (expenseDate.getFullYear() === currentYear) {
          const month = expenseDate.getMonth();
          data[month] += parseFloat(expense.amount);
        }
      });

      return data;
    },

    // Filter methods
    async applyDateFilter() {
      if (this.dateFilter.start && this.dateFilter.end) {
        try {
          const params = new URLSearchParams({
            startDate: this.dateFilter.start,
            endDate: this.dateFilter.end,
          });

          const response = await fetch(`/api/expenses?${params}`);
          if (response.ok) {
            this.expenses = await response.json();
          }
        } catch (error) {
          console.error("Failed to filter expenses:", error);
        }
      }
    },

    // Computed properties
    get recentExpenses() {
      return this.expenses
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    },

    get filteredExpenses() {
      return this.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    // Utility methods
    formatCurrency(amount) {
      return "Rp " + new Intl.NumberFormat("id-ID").format(amount || 0);
    },

    formatDate(dateString) {
      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "Asia/Jakarta",
      };
      return new Date(dateString).toLocaleDateString("id-ID", options);
    },

    getCurrentDate() {
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Jakarta",
      };
      return new Date().toLocaleDateString("id-ID", options);
    },

    getPageTitle() {
      const titles = {
        home: "Dashboard",
        reports: "Laporan",
      };
      return titles[this.activeTab] || "Expense Tracker";
    },

    getBudgetPercentage() {
      if (this.monthlyBudget === 0) return 0;
      return Math.min(
        Math.round((this.monthlySpent / this.monthlyBudget) * 100),
        100
      );
    },

    getBudgetStatus() {
      const percentage = this.getBudgetPercentage();
      const remaining = this.monthlyBudget - this.monthlySpent;

      if (percentage >= 100) {
        return `Melebihi budget ${this.formatCurrency(Math.abs(remaining))}`;
      } else if (percentage >= 90) {
        return `Sisa ${this.formatCurrency(remaining)}`;
      } else {
        return `Sisa ${this.formatCurrency(remaining)}`;
      }
    },

    getBudgetBarColor() {
      const percentage = this.getBudgetPercentage();
      if (percentage >= 100) return "bg-red-500";
      if (percentage >= 90) return "bg-orange-500";
      if (percentage >= 70) return "bg-yellow-500";
      return "bg-green-500";
    },

    getBudgetTextColor() {
      const percentage = this.getBudgetPercentage();
      if (percentage >= 100) return "text-red-600";
      if (percentage >= 90) return "text-orange-600";
      return "text-gray-800";
    },

    // Theme methods
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode;
      this.applyTheme();

      // Simpan preferensi ke localStorage
      localStorage.setItem("darkMode", this.isDarkMode ? "true" : "false");

      // Notifikasi
      if (window.notifications) {
        if (this.isDarkMode) {
          notifications.info("Dark mode activated");
        } else {
          notifications.info("Light mode activated");
        }
      }
    },

    applyTheme() {
      if (this.isDarkMode) {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }

      // Update navbar dan body styling
      this.$nextTick(() => {
        const navbar = document.querySelector(".modern-navbar");
        if (navbar) {
          // Refresh navbar styles jika diperlukan
          const activeTab = this.activeTab;
          this.setActiveTab(activeTab);
        }
      });
    },

    // Load theme dari localStorage
    loadTheme() {
      const savedTheme = localStorage.getItem("darkMode");
      if (savedTheme === "true") {
        this.isDarkMode = true;
        this.applyTheme();
      }
    },    // Authentication protection (silent, no annoying notifications)
    requireAuth() {
      if (!this.isAuthenticated) {
        console.warn("Access denied: Authentication required");
        // Don't show notification, just silently return false
        return false;
      }
      return true;
    },
    // Protected API call wrapper
    async apiCall(url, options = {}) {
      if (!this.requireAuth()) {
        return null;
      }      try {
        // Add auth token to headers
        const defaultOptions = {
          headers: {
            "X-Auth-Token": this.authToken,
            ...options.headers
          },
          ...options,
        };        const response = await fetch(url, defaultOptions);

        // Check if token is invalid (only happens if token was manually revoked)
        if (response.status === 401) {
          console.warn("Token invalid, please login again");
          this.authToken = null;
          localStorage.removeItem('authToken');
          this.isAuthenticated = false;
          // Don't show annoying notification, just silently redirect to login
          return null;
        }

        return response;
      } catch (error) {
        console.error("API call failed:", error);
        if (window.notifications) {
          notifications.error("Terjadi kesalahan koneksi");
        }
        return null;
      }
    },
  };
}
