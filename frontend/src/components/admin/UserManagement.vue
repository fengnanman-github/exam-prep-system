<template>
  <div class="user-management">
    <div class="toolbar">
      <div class="search-box">
        <input v-model="searchQuery" type="text" placeholder="搜索用户名、邮箱..." class="search-input" />
      </div>
      <div class="filters">
        <select v-model="statusFilter" class="filter-select">
          <option value="">全部状态</option>
          <option value="pending_verification">待验证</option>
          <option value="pending_approval">待审批</option>
          <option value="approved">已批准</option>
          <option value="rejected">已拒绝</option>
        </select>
        <select v-model="roleFilter" class="filter-select">
          <option value="">全部角色</option>
          <option value="user">学员</option>
          <option value="admin">管理员</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else class="users-table">
      <table>
        <thead>
          <tr>
            <th>用户名</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>状态</th>
            <th>注册时间</th>
            <th>最后登录</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.username }}</td>
            <td>{{ user.email || '-' }}</td>
            <td>
              <span :class="['role-badge', user.role]">{{ user.role === 'admin' ? '管理员' : '学员' }}</span>
            </td>
            <td>
              <span :class="['status-badge', user.approval_status]">
                {{ getStatusText(user.approval_status) }}
              </span>
            </td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td>{{ user.last_login_at ? formatDate(user.last_login_at) : '从未登录' }}</td>
            <td class="actions">
              <button v-if="user.approval_status === 'pending_approval'" @click="approveUser(user)" class="btn-approve" title="批准">✅</button>
              <button v-if="user.approval_status === 'pending_approval'" @click="rejectUser(user)" class="btn-reject" title="拒绝">❌</button>
              <button v-if="user.is_active" @click="toggleUser(user, 'disable')" class="btn-disable" title="禁用">🔒</button>
              <button v-else @click="toggleUser(user, 'enable')" class="btn-enable" title="启用">🔓</button>
              <button @click="resetPassword(user)" class="btn-reset" title="重置密码">🔑</button>
              <button @click="viewDetails(user)" class="btn-view" title="详情">📋</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="users.length === 0" class="empty-state">
        <p>暂无用户数据</p>
      </div>
    </div>

    <div class="pagination">
      <button :disabled="currentPage === 1" @click="loadUsers(currentPage - 1)">上一页</button>
      <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button :disabled="currentPage === totalPages" @click="loadUsers(currentPage + 1)">下一页</button>
    </div>

    <!-- 用户详情弹窗 -->
    <div v-if="selectedUser" class="modal-overlay" @click="selectedUser = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>用户详情</h3>
          <button @click="selectedUser = null" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span class="label">用户名：</span>
            <span>{{ selectedUser.username }}</span>
          </div>
          <div class="detail-row">
            <span class="label">邮箱：</span>
            <span>{{ selectedUser.email || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">角色：</span>
            <span>{{ selectedUser.role }}</span>
          </div>
          <div class="detail-row">
            <span class="label">状态：</span>
            <span>{{ getStatusText(selectedUser.approval_status) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">注册时间：</span>
            <span>{{ formatDate(selectedUser.created_at) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">登录次数：</span>
            <span>{{ selectedUser.login_count || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserManagement',
  inject: ['authStore'],

  data() {
    return {
      users: [],
      loading: false,
      error: '',
      searchQuery: '',
      statusFilter: '',
      roleFilter: '',
      currentPage: 1,
      totalPages: 1,
      pageSize: 20,
      selectedUser: null
    };
  },

  mounted() {
    this.loadUsers();
  },

  watch: {
    searchQuery() { this.loadUsers(1); },
    statusFilter() { this.loadUsers(1); },
    roleFilter() { this.loadUsers(1); }
  },

  methods: {
    async loadUsers(page = 1) {
      this.loading = true;
      this.error = '';

      try {
        const params = new URLSearchParams({
          page: page,
          limit: this.pageSize
        });

        if (this.searchQuery) params.append('search', this.searchQuery);
        if (this.statusFilter) params.append('status', this.statusFilter);
        if (this.roleFilter) params.append('role', this.roleFilter);

        const response = await fetch(`/api/v2/admin/users?${params}`, {
          headers: { 'Authorization': `Bearer ${this.authStore.token}` }
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || '加载失败');

        this.users = data.users;
        this.currentPage = data.pagination.page;
        this.totalPages = data.pagination.totalPages;

      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async approveUser(user) {
      if (!confirm(`确定批准用户 ${user.username} 吗？`)) return;

      try {
        const response = await fetch(`/api/v2/admin/users/${user.id}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authStore.token}`
          },
          body: JSON.stringify({ notes: '管理员批准' })
        });

        if (!response.ok) throw new Error('批准失败');

        alert('用户已批准');
        this.loadUsers(this.currentPage);

      } catch (error) {
        alert('批准失败: ' + error.message);
      }
    },

    async rejectUser(user) {
      const reason = prompt(`拒绝用户 ${user.username}，请输入原因：`);
      if (!reason) return;

      try {
        const response = await fetch(`/api/v2/admin/users/${user.id}/reject`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authStore.token}`
          },
          body: JSON.stringify({ reason })
        });

        if (!response.ok) throw new Error('拒绝失败');

        alert('用户已拒绝');
        this.loadUsers(this.currentPage);

      } catch (error) {
        alert('拒绝失败: ' + error.message);
      }
    },

    async toggleUser(user, action) {
      const actionText = action === 'enable' ? '启用' : '禁用';
      if (!confirm(`确定${actionText}用户 ${user.username} 吗？`)) return;

      try {
        const response = await fetch(`/api/v2/admin/users/${user.id}/toggle`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authStore.token}`
          },
          body: JSON.stringify({ action })
        });

        if (!response.ok) throw new Error(`${actionText}失败`);

        alert(`用户已${actionText}`);
        this.loadUsers(this.currentPage);

      } catch (error) {
        alert(`${actionText}失败: ` + error.message);
      }
    },

    async resetPassword(user) {
      if (!confirm(`确定重置用户 ${user.username} 的密码吗？`)) return;

      try {
        const response = await fetch(`/api/v2/admin/users/${user.id}/reset-password`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authStore.token}`
          }
        });

        const data = await response.json();
        if (!response.ok) throw new Error('重置失败');

        alert(`密码已重置为: ${data.new_password}\n请告知用户新密码`);

      } catch (error) {
        alert('重置失败: ' + error.message);
      }
    },

    viewDetails(user) {
      this.selectedUser = user;
    },

    getStatusText(status) {
      const texts = {
        'pending_verification': '待验证',
        'pending_approval': '待审批',
        'approved': '已批准',
        'rejected': '已拒绝',
        'suspended': '已暂停'
      };
      return texts[status] || status;
    },

    formatDate(dateStr) {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN');
    }
  }
};
</script>

<style scoped>
.user-management { padding: 1rem; }

.toolbar { display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 300px; }
.search-input { width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; }
.search-input:focus { outline: none; border-color: #667eea; }

.filters { display: flex; gap: 0.5rem; }
.filter-select { padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; cursor: pointer; }

.users-table { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.users-table table { width: border-collapse: collapse; }
.users-table th, .users-table td { padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
.users-table th { background: #f9fafb; font-weight: 600; color: #374151; }
.users-table tbody tr:hover { background: #f9fafb; }

.role-badge, .status-badge { padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 500; }
.role-badge.admin { background: #dbeafe; color: #1e40af; }
.role-badge.user { background: #e0e7ff; color: #3730a3; }
.status-badge.pending_verification { background: #fef3c7; color: #92400e; }
.status-badge.pending_approval { background: #fed7aa; color: #9a3412; }
.status-badge.approved { background: #d1fae5; color: #065f46; }
.status-badge.rejected { background: #fecaca; color: #991b1b; }
.status-badge.suspended { background: #e5e7eb; color: #374151; }

.actions { display: flex; gap: 0.5rem; }
.actions button { padding: 0.5rem; border: none; background: none; cursor: pointer; font-size: 1.2rem; transition: transform 0.2s; }
.actions button:hover { transform: scale(1.2); }

.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; }
.pagination button { padding: 0.5rem 1rem; border: 1px solid #e5e7eb; background: white; border-radius: 6px; cursor: pointer; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }

.loading, .error, .empty-state { text-align: center; padding: 3rem; color: #6b7280; }
.error { color: #dc2626; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h3 { margin: 0; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.detail-row { display: flex; padding: 0.75rem 0; border-bottom: 1px solid #f3f4f6; }
.detail-row .label { font-weight: 500; width: 120px; color: #6b7280; }
</style>
