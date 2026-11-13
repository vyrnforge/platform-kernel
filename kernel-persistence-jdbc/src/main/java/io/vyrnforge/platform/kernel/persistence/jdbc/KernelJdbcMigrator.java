package io.vyrnforge.platform.kernel.persistence.jdbc;

import org.flywaydb.core.Flyway;

import javax.sql.DataSource;
import java.util.Objects;

public final class KernelJdbcMigrator {
    private KernelJdbcMigrator() {}

    public static void migrate(DataSource dataSource) {
        Objects.requireNonNull(dataSource, "dataSource");
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .load()
                .migrate();
    }
}
