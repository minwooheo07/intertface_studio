package com.ifstudio.ifengine.engine.adapter;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

/** application.yml의 if-engine.datasources.* 바인딩 */
@ConfigurationProperties(prefix = "if-engine")
@Getter @Setter
public class IfEngineProps {

    private Map<String, Ds> datasources = new HashMap<>();

    @Getter @Setter
    public static class Ds {
        private String url;
        private String username;
        private String password;
        private String driverClassName;
    }
}
