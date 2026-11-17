package io.vyrnforge.platform.kernel.persistence.jdbc;

import org.flywaydb.core.Flyway;

import javax.sql.DataSource;
import java.util.Objects;

/**
 * Legacy convenience migrator for applications that delegate the default
 * Flyway migration directory/history to Kernel. Existing deployed history is
 * intentionally retained. Applications with their own Flyway migration owner
 * must reconcile discovery locations and version/history ownership before use.
 * See docs/integration/jdbc-migrations.md.
 */
public final class KernelJdbcMigrator {
    private KernelJdbcMigrator() {}

    /**
     * Applies the immutable Kernel V1-V3 scripts from classpath:db/migration
     * to the default Flyway history table. This may also discover application
     * SQL in the same classpath directory; do not call blindly in a host with
     * its own migrations. Existing installations must retain their history.
     */
    public static void migrate(DataSource dataSource) {
        Objects.requireNonNull(dataSource, "dataSource");
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .migrate();
    }
}
