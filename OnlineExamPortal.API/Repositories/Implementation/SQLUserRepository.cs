using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Repositories.Interface;

namespace OnlineExamPortal.API.Repositories.Implementation
{
    public class SQLUserRepository : IUserRepository
    {
        private readonly IConfiguration configuration;
        private readonly string connectionString;

        public SQLUserRepository(IConfiguration configuration)
        {
            this.configuration = configuration;
            connectionString = configuration.GetConnectionString("OnlineExamPortalConnectionString");
        }

        public async Task<List<User>> GetAllAsync()
        {
            var users = new List<User>();

            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("SELECT * FROM Users", conn);

            await conn.OpenAsync();

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                users.Add(new User
                {
                    Id = (int)reader["Id"],
                    FullName = reader["FullName"].ToString()!,
                    Email = reader["Email"].ToString()!,
                    PasswordHash = reader["PasswordHash"].ToString()!,
                    UserRole = reader["UserRole"].ToString()!,
                    CreatedAt = (DateTime)reader["CreatedAt"]
                });
            }

            return users;
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("SELECT * FROM Users WHERE Id = @Id", conn);

            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new User
                {
                    Id = (int)reader["Id"],
                    FullName = reader["FullName"].ToString()!,
                    Email = reader["Email"].ToString()!,
                    PasswordHash = reader["PasswordHash"].ToString()!,
                    UserRole = reader["UserRole"].ToString()!,
                    CreatedAt = (DateTime)reader["CreatedAt"]
                };
            }

            return null;
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_GetUserByEmail", conn);
            cmd.CommandType = System.Data.CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@Email", email);

            await conn.OpenAsync();

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new User
                {
                    Id = (int)reader["Id"],
                    FullName = reader["FullName"].ToString()!,
                    Email = reader["Email"].ToString()!,
                    PasswordHash = reader["PasswordHash"].ToString()!,
                    UserRole = reader["UserRole"].ToString()!,
                    CreatedAt = (DateTime)reader["CreatedAt"]
                };
            }

            return null;
        }

        public async Task CreateAsync(User user)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand(@"
                INSERT INTO Users (FullName, Email, PasswordHash, UserRole, CreatedAt)
                VALUES (@FullName, @Email, @PasswordHash, @UserRole, @CreatedAt)
            ", conn);

            cmd.Parameters.AddWithValue("@FullName", user.FullName);
            cmd.Parameters.AddWithValue("@Email", user.Email);
            cmd.Parameters.AddWithValue("@PasswordHash", user.PasswordHash);
            cmd.Parameters.AddWithValue("@UserRole", user.UserRole);
            cmd.Parameters.AddWithValue("@CreatedAt", user.CreatedAt);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task UpdateAsync(User user)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_UpdateUser", conn);
            cmd.CommandType = System.Data.CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@Id", user.Id);
            cmd.Parameters.AddWithValue("@FullName", user.FullName);
            cmd.Parameters.AddWithValue("@Email", user.Email);
            cmd.Parameters.AddWithValue("@UserRole", user.UserRole);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task DeleteAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_DeleteUser", conn);
            cmd.CommandType = System.Data.CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<bool> ExistsAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("SELECT COUNT(1) FROM Users WHERE Id = @Id", conn);

            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();

            var result = await cmd.ExecuteScalarAsync();
            return Convert.ToInt32(result) > 0;
        }
    }
}