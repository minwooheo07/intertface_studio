package com.samchully.ifengine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class IfEngineApplication {
    public static void main(String[] args) {
        SpringApplication.run(IfEngineApplication.class, args);
    }
}
