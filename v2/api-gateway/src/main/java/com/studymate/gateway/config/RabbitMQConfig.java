package com.studymate.gateway.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String QUEUE_PDF_INDEX = "pdf.index.queue";
    public static final String EXCHANGE_PDF_INDEX = "pdf.index.exchange";
    public static final String ROUTING_KEY_PDF_INDEX = "pdf.index.routing";

    @Bean
    public Queue pdfIndexQueue() {
        return new Queue(QUEUE_PDF_INDEX, true);
    }

    @Bean
    public DirectExchange pdfIndexExchange() {
        return new DirectExchange(EXCHANGE_PDF_INDEX);
    }

    @Bean
    public Binding pdfIndexBinding(Queue pdfIndexQueue, DirectExchange pdfIndexExchange) {
        return BindingBuilder.bind(pdfIndexQueue).to(pdfIndexExchange).with(ROUTING_KEY_PDF_INDEX);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
