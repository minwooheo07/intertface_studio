package com.ifstudio.ifengine.engine.adapter;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 연동 시스템별 DataSource 풀.
 * SRC_CONFIG/TGT_CONFIG의 "datasource" 이름으로 조회한다.
 * "local" 또는 미지정이면 엔진 기본 DB를 사용한다.
 */
@Component
public class DataSourceRegistry {

    private final DataSource primary;
    private final IfEngineProps props;
    private final Map<String, DataSource> cache = new ConcurrentHashMap<>();

    public DataSourceRegistry(DataSource primary, IfEngineProps props) {
        this.primary = primary;
        this.props = props;
    }

    public DataSource get(String name) {
        if (name == null || name.isBlank() || "local".equalsIgnoreCase(name)) {
            return primary;
        }
        return cache.computeIfAbsent(name, n -> {
            IfEngineProps.Ds d = props.getDatasources().get(n);
            if (d == null) {
                throw new IllegalArgumentException(
                        "미정의 데이터소스: " + n + " (application.yml의 if-engine.datasources 확인)");
            }
            HikariDataSource ds = new HikariDataSource();
            ds.setJdbcUrl(d.getUrl());
            ds.setUsername(d.getUsername());
            ds.setPassword(d.getPassword());
            if (d.getDriverClassName() != null) ds.setDriverClassName(d.getDriverClassName());
            ds.setMaximumPoolSize(5);
            ds.setPoolName("if-" + n);
            return ds;
        });
    }
}
