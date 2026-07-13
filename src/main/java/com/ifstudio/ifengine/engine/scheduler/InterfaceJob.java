package com.ifstudio.ifengine.engine.scheduler;

import com.ifstudio.ifengine.engine.InterfaceExecutor;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Quartz 잡. spring-boot-starter-quartz가 스프링 빈 주입을 지원하므로
 * @Autowired 로 엔진을 그대로 사용한다.
 */
public class InterfaceJob implements Job {

    private static final Logger log = LoggerFactory.getLogger(InterfaceJob.class);

    @Autowired
    private InterfaceExecutor executor;

    @Override
    public void execute(JobExecutionContext ctx) {
        String ifId = ctx.getMergedJobDataMap().getString("ifId");
        try {
            executor.execute(ifId, "SCHEDULE");
        } catch (Exception e) {
            log.error("[{}] 스케줄 실행 오류", ifId, e);
        }
    }
}
